// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {submitInteractiveDialog, lookupInteractiveDialog} from '@actions/remote/integrations';
import {AppCallResponseTypes} from '@constants/apps';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import {convertAppFormValuesToDialogSubmission, convertDialogToAppForm} from './dialog_conversion';
import {DialogErrorMessages} from './dialog_utils';

import type {IntlShape} from 'react-intl';

/**
 * Mobile Interactive Dialog Adapter
 * Converts between legacy Interactive Dialogs and modern AppsForm system
 * Following the same pattern as webapp PR #31821
 */
export class InteractiveDialogAdapter {
    // WeakMap cache for expensive form conversions
    // Keys are garbage collected when config objects are no longer referenced
    private static readonly appFormCache = new WeakMap<InteractiveDialogConfig, AppForm>();

    /**
     * Convert InteractiveDialog config to AppForm structure
     * Pure data transformation - no component creation
     * Cached using WeakMap for performance
     */
    static convertToAppForm(config: InteractiveDialogConfig): AppForm {
        // Check cache first
        const cached = InteractiveDialogAdapter.appFormCache.get(config);
        if (cached) {
            return cached;
        }

        // Convert and cache result
        const converted = convertDialogToAppForm(config);
        InteractiveDialogAdapter.appFormCache.set(config, converted);
        return converted;
    }

    /**
     * Convert AppForm values back to DialogSubmission format
     * Used when submitting converted dialogs through legacy endpoints
     */
    static convertValuesToSubmission(
        values: AppFormValues,
        config: InteractiveDialogConfig,
    ): DialogSubmission {
        const elements = config.dialog.elements || [];

        const {submission, errors} = convertAppFormValuesToDialogSubmission(
            values,
            elements,
        );

        if (errors.length > 0) {
            logDebug('Dialog conversion validation errors', {
                errorCount: errors.length,
                errors,
            });
        }

        return {
            url: config.url || '',
            callback_id: config.dialog.callback_id || '',
            state: config.dialog.state || '',
            submission: submission as {[x: string]: string},
            user_id: '', // Will be populated by mobile action
            channel_id: '', // Will be populated by mobile action
            team_id: '', // Will be populated by mobile action
            cancelled: false,
        };
    }

    /**
     * Create a submission handler for AppsFormContainer
     * Converts AppForm submission to legacy dialog submission
     */
    static createSubmitHandler(
        config: InteractiveDialogConfig,
        serverUrl: string,
        intl: IntlShape,
    ) {
        return async (values: AppFormValues): Promise<DoAppCallResult<FormResponseData>> => {
            try {
                // Convert values to legacy dialog submission format
                const legacySubmission = InteractiveDialogAdapter.convertValuesToSubmission(values, config);

                // Submit through existing mobile action
                const result = await submitInteractiveDialog(serverUrl, legacySubmission);

                // Convert response back to AppCallResponse format
                return InteractiveDialogAdapter.convertResponseToAppCall(result, intl);
            } catch (error) {
                const errorMessage = getFullErrorMessage(error);
                logDebug('Dialog submission failed', errorMessage);

                // Provide more context in error messages
                let userFriendlyMessage: string;
                if (error instanceof Error) {
                    if (error.message.includes('network') || error.message.includes('fetch')) {
                        userFriendlyMessage = intl.formatMessage({
                            id: DialogErrorMessages.SUBMISSION_FAILED_NETWORK,
                            defaultMessage: 'Submission failed due to network error. Please check your connection and try again.',
                        });
                    } else if (error.message.includes('conversion') || error.message.includes('validation')) {
                        userFriendlyMessage = intl.formatMessage({
                            id: DialogErrorMessages.SUBMISSION_FAILED_VALIDATION,
                            defaultMessage: 'Submission failed due to form validation. Please check your inputs and try again.',
                        });
                    } else {
                        userFriendlyMessage = intl.formatMessage({
                            id: DialogErrorMessages.SUBMISSION_FAILED_WITH_DETAILS,
                            defaultMessage: 'Submission failed: {error}',
                        }, {error: error.message});
                    }
                } else {
                    userFriendlyMessage = intl.formatMessage({
                        id: DialogErrorMessages.SUBMISSION_FAILED,
                        defaultMessage: 'Submission failed. Please try again.',
                    });
                }

                return {
                    error: {
                        type: AppCallResponseTypes.ERROR,
                        text: userFriendlyMessage,
                        data: {
                            errors: {},
                        },
                    },
                };
            }
        };
    }

    /**
     * Create a cancellation handler for AppsFormContainer
     * Handles dialog cancellation notification if required
     */
    static createCancelHandler(
        config: InteractiveDialogConfig,
        serverUrl: string,
    ) {
        return async (): Promise<void> => {
            if (config.dialog.notify_on_cancel) {
                try {
                    const legacySubmission = InteractiveDialogAdapter.convertValuesToSubmission({}, config);
                    await submitInteractiveDialog(serverUrl, {
                        ...legacySubmission,
                        cancelled: true,
                    });
                } catch (error) {
                    logDebug('Dialog cancellation failed', getFullErrorMessage(error));
                }
            }
        };
    }

    /**
     * Convert dialog submission response to AppCallResponse format
     * Handles the response format conversion
     */
    static convertResponseToAppCall(
        result: any,
        intl: IntlShape,
    ): DoAppCallResult<FormResponseData> {
        // Handle server-side validation errors from the response data
        if (result?.data?.error || result?.data?.errors) {
            return {
                error: {
                    type: AppCallResponseTypes.ERROR,
                    text: result.data.error || intl.formatMessage({
                        id: 'interactive_dialog.submission_failed_validation',
                        defaultMessage: 'Submission failed with validation errors',
                    }),
                    data: {
                        errors: result.data.errors || {},
                    },
                },
            };
        }

        // Handle network/action-level errors
        if (result?.error) {
            return {
                error: {
                    type: AppCallResponseTypes.ERROR,
                    text: intl.formatMessage({
                        id: 'interactive_dialog.submission_failed',
                        defaultMessage: 'Submission failed',
                    }),
                    data: {
                        errors: {},
                    },
                },
            };
        }

        // Success response
        return {
            data: {
                type: AppCallResponseTypes.OK,
                text: '',
            },
        };
    }

    /**
     * Perform dynamic lookup for select fields
     * Uses lookupInteractiveDialog action following webapp pattern
     */
    static async performDynamicLookup(
        element: DialogElement,
        userInput: string,
        serverUrl: string,
        config?: InteractiveDialogConfig,
    ): Promise<AppSelectOption[]> {
        if (!element.data_source_url) {
            return [];
        }

        try {
            // Create DialogSubmission following webapp pattern
            const submission: DialogSubmission = {
                url: element.data_source_url,
                callback_id: config?.dialog.callback_id || '',
                state: config?.dialog.state || '',
                user_id: '', // Will be populated by action
                channel_id: '', // Will be populated by action
                team_id: '', // Will be populated by action
                cancelled: false,
                submission: {
                    selected_field: element.name,
                },
            };

            // Use lookupInteractiveDialog action like webapp
            const result = await lookupInteractiveDialog(serverUrl, submission);

            if (result?.data && typeof result.data === 'object' && 'items' in result.data) {
                const responseData = result.data as {items: DialogOption[]};
                if (Array.isArray(responseData.items)) {
                    // API returns {items: DialogOption[]} format
                    const mappedOptions = responseData.items.map((option: DialogOption) => ({
                        label: option.text || '',
                        value: option.value || '',
                    }));
                    return mappedOptions;
                }
            }

            if (result?.error) {
                logDebug('Dynamic lookup failed', getFullErrorMessage(result.error));
            }
        } catch (error) {
            logDebug('Dynamic lookup error', getFullErrorMessage(error));
        }

        return [];
    }
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState, useRef} from 'react';
import {useIntl} from 'react-intl';
import {Navigation} from 'react-native-navigation';

import {submitInteractiveDialog} from '@actions/remote/integrations';
import {AppCallResponseTypes} from '@constants/apps';
import {useServerUrl} from '@context/server';
import AppsFormComponent from '@screens/apps_form/apps_form_component';
import InteractiveDialog from '@screens/interactive_dialog';
import {isAppSelectOption} from '@utils/dialog_utils';
import {getFullErrorMessage} from '@utils/errors';
import {InteractiveDialogAdapter} from '@utils/interactive_dialog_adapter';
import {logDebug} from '@utils/log';

import type {AvailableScreens} from '@typings/screens/navigation';

export type DialogRouterProps = {
    config: InteractiveDialogConfig;
    componentId: AvailableScreens;
    isAppsFormEnabled: boolean;
};

/**
 * DialogRouter - Routes between legacy InteractiveDialog and modern AppsForm
 * Based on webapp DialogRouter component from PR #31821
 *
 * When InteractiveDialogAppsForm feature flag is enabled:
 * - Converts dialog config to AppForm format
 * - Renders AppsFormContainer with conversion handlers
 *
 * When feature flag is disabled:
 * - Renders legacy InteractiveDialog component
 */
export const DialogRouter = React.memo<DialogRouterProps>(({
    config,
    componentId,
    isAppsFormEnabled,
}) => {

    const serverUrl = useServerUrl();
    const intl = useIntl();

    // State to track current dialog config (can be updated by refresh)
    const [currentConfig, setCurrentConfig] = useState<InteractiveDialogConfig>(config);

    // State to accumulate values across multiform steps
    const [accumulatedValues, setAccumulatedValues] = useState<AppFormValues>({});

    // Ref to track if this is a multiform dialog to avoid repeated checks
    const isMultiformRef = useRef(false);

    // Helper to convert select options array to comma-separated string
    const convertSelectOptionsToString = (optionsArray: AppSelectOption[]): string => {
        return optionsArray.map((opt) => opt.value || '').join(',');
    };

    // Memoized value conversion function for better performance
    const convertAppFormValuesToSubmission = useCallback((values: AppFormValues): {[key: string]: string} => {
        const submission: {[key: string]: string} = {};

        for (const [fieldName, value] of Object.entries(values)) {
            if (value === null || value === undefined) {
                continue; // Skip null/undefined values
            }

            if (typeof value === 'boolean') {
                submission[fieldName] = value ? 'true' : 'false';
            } else if (typeof value === 'number') {
                submission[fieldName] = String(value);
            } else if (isAppSelectOption(value)) {
                submission[fieldName] = value.value || '';
            } else if (Array.isArray(value) && value.length > 0 && isAppSelectOption(value[0])) {
                submission[fieldName] = convertSelectOptionsToString(value);
            } else {
                submission[fieldName] = String(value || '');
            }
        }

        return submission;
    }, []);

    // Update modal title when dialog config changes
    React.useEffect(() => {
        if (currentConfig.dialog.title) {
            Navigation.mergeOptions(componentId, {
                topBar: {
                    title: {
                        text: currentConfig.dialog.title,
                    },
                },
            });
        }
    }, [currentConfig.dialog.title, componentId]);

    // Create submit handler that converts AppForm values back to legacy format
    const handleSubmit = useCallback(async (values: AppFormValues): Promise<DoAppCallResult<FormResponseData>> => {
        // Early return if no values to submit
        if (Object.keys(values).length === 0 && Object.keys(accumulatedValues).length === 0) {
            return {
                error: {
                    type: AppCallResponseTypes.ERROR,
                    text: 'No values to submit',
                    data: {errors: {}},
                },
            };
        }

        // Merge current step values with accumulated values from previous steps
        const allValues = {...accumulatedValues, ...values};

        // Don't use createSubmitHandler - call convertValuesToSubmission directly
        // to ensure we use the current config state (not a captured closure)
        try {
            // For multiform dialogs with accumulated values, create submission directly
            // to avoid filtering out fields from previous steps
            let legacySubmission: DialogSubmission;

            const isMultiform = Object.keys(accumulatedValues).length > 0;
            isMultiformRef.current = isMultiform;

            if (isMultiform) {
                // This is a multiform submission - include ALL accumulated values
                const multiformSubmission = convertAppFormValuesToSubmission(allValues);

                legacySubmission = {
                    url: currentConfig.url || '',
                    callback_id: currentConfig.dialog.callback_id || '',
                    state: currentConfig.dialog.state || '',
                    submission: multiformSubmission,
                    user_id: '', // Will be populated by mobile action
                    channel_id: '', // Will be populated by mobile action
                    team_id: '', // Will be populated by mobile action
                    cancelled: false,
                };
            } else {
                // Single-step dialog - use normal conversion
                legacySubmission = InteractiveDialogAdapter.convertValuesToSubmission(allValues, currentConfig);
            }
            const submitResult = await submitInteractiveDialog(serverUrl, legacySubmission);

            // Convert response back to AppCallResponse format
            const result = InteractiveDialogAdapter.convertResponseToAppCall(submitResult, intl);

            // Handle multiform response - update dialog config if new form is returned
            if (result.data?.type === 'form' && result.data.form) {
            // Get the raw dialog data from server response to preserve callback_id and state
                const rawDialogData = result.data.form as any;

                // Accumulate values from this step for the next step
                const newAccumulatedValues = {...accumulatedValues, ...values};
                setAccumulatedValues(newAccumulatedValues);

                // Use the raw dialog data from server - it's already in the correct format!
                const newDialogConfig: InteractiveDialogConfig = {
                    ...currentConfig,
                    dialog: {
                        ...rawDialogData, // Use the raw dialog response from server
                        // Preserve some properties from current config if not provided
                        icon_url: rawDialogData.icon_url || currentConfig.dialog.icon_url,
                        notify_on_cancel: rawDialogData.notify_on_cancel === undefined ?
                            currentConfig.dialog.notify_on_cancel :
                            rawDialogData.notify_on_cancel,
                    },
                };
                setCurrentConfig(newDialogConfig);
            } else {
            // Clear accumulated values since dialog is completing
                setAccumulatedValues({});
            }

            return result;
        } catch (error) {
            const errorMessage = getFullErrorMessage(error);
            logDebug('Dialog submission failed', errorMessage);

            // Provide more context in error messages
            let userFriendlyMessage: string;
            if (error instanceof Error) {
                if (error.message.includes('network') || error.message.includes('fetch')) {
                    userFriendlyMessage = intl.formatMessage({
                        id: 'interactive_dialog.submission_failed_network',
                        defaultMessage: 'Submission failed due to network error. Please check your connection and try again.',
                    });
                } else if (error.message.includes('conversion') || error.message.includes('validation')) {
                    userFriendlyMessage = intl.formatMessage({
                        id: 'interactive_dialog.submission_failed_validation',
                        defaultMessage: 'Submission failed due to form validation. Please check your inputs and try again.',
                    });
                } else {
                    userFriendlyMessage = intl.formatMessage({
                        id: 'interactive_dialog.submission_failed_with_details',
                        defaultMessage: 'Submission failed: {error}',
                    }, {error: error.message});
                }
            } else {
                userFriendlyMessage = intl.formatMessage({
                    id: 'interactive_dialog.submission_failed',
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
    }, [currentConfig, serverUrl, intl, accumulatedValues, convertAppFormValuesToSubmission]);

    // Memoize form conversion to avoid recalculation on every render
    const appForm = useMemo(() => {
        if (!isAppsFormEnabled) {
            logDebug('DialogRouter: Apps Form disabled, using legacy dialog');
            return null;
        }
        try {
            const converted = InteractiveDialogAdapter.convertToAppForm(currentConfig);
            return converted;
        } catch (error) {
            logDebug('DialogRouter: Failed to convert to AppForm', error);
            return null;
        }
    }, [currentConfig.dialog, isAppsFormEnabled]); // More specific dependency

    // Helper function to find the dialog element by field name
    function findDialogElement(elements: any[], fieldName: string) {
        return elements.find((e) => e.name === fieldName);
    }

    // Create performLookupCall for dynamic select fields
    const performLookupCall = useCallback(async (field: AppField, values: AppFormValues, userInput: AppFormValue): Promise<DoAppCallResult<AppLookupResponse>> => {
        const elements = config.dialog.elements || [];
        const element = findDialogElement(elements, field.name ?? '');

        if (!element || element.data_source !== 'dynamic' || !element.data_source_url) {
            return {data: {type: 'ok', data: {items: []}}};
        }

        try {
            // Make the dynamic lookup request using InteractiveDialogAdapter
            const result = await InteractiveDialogAdapter.performDynamicLookup(element, String(userInput || ''), serverUrl, config);
            return {data: {type: 'ok', data: {items: result}}};
        } catch (error) {
            return {data: {type: 'ok', data: {items: []}}};
        }
    }, [currentConfig, serverUrl]);

    // Create refreshOnSelect for Interactive Dialog field refresh support
    const refreshOnSelect = useCallback(async (field: AppField, values: AppFormValues): Promise<DoAppCallResult<FormResponseData>> => {

        // For Interactive Dialogs, field refresh uses the standard dialog submission
        // which routes to the plugin URL automatically
        try {

            // Convert current values back to dialog submission format
            const dialogSubmission = InteractiveDialogAdapter.convertValuesToSubmission(values, currentConfig);

            // Add the selected field that triggered refresh
            dialogSubmission.submission.selected_field = field.name || '';

            // Set type to indicate this is a refresh request (matching webapp)
            (dialogSubmission as any).type = 'refresh';

            // Use the existing submitInteractiveDialog action which handles routing properly
            const result = await submitInteractiveDialog(serverUrl, dialogSubmission);

            // Check if we got a new dialog configuration back
            // Server returns {"form": {...}, "type": "form"} format
            if (result.data && typeof result.data === 'object' && 'form' in result.data) {
                const formResult = result.data as {form: InteractiveDialogConfig['dialog']; type: string};

                // Update the dialog config state with new form data
                const newConfig = {
                    ...currentConfig,
                    dialog: formResult.form,
                };

                setCurrentConfig(newConfig);

                // Convert the new dialog to AppForm
                const newAppForm = InteractiveDialogAdapter.convertToAppForm(newConfig);

                return {
                    data: {
                        type: 'form' as AppCallResponseType,
                        form: newAppForm,
                    },
                };
            }

            // Handle errors from dialog submission
            if (result.error) {
                return {
                    error: {
                        type: 'error' as AppCallResponseType,
                        text: 'Field refresh failed',
                    },
                };
            }

            return {data: {type: 'ok'}};
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            return {
                error: {
                    type: 'error' as AppCallResponseType,
                    text: intl.formatMessage({
                        id: 'interactive_dialog.refresh_failed',
                        defaultMessage: 'Failed to refresh form fields',
                    }) + ` (${errorMessage})`,
                },
            };
        }
    }, [currentConfig, serverUrl, intl, setCurrentConfig]);

    if (isAppsFormEnabled && appForm && appForm.fields) {
        return (
            <AppsFormComponent
                form={appForm}
                componentId={componentId}
                submit={handleSubmit}
                performLookupCall={performLookupCall}
                refreshOnSelect={refreshOnSelect}
            />
        );
    }

    // Feature flag disabled or AppsForm failed - use legacy InteractiveDialog
    return (
        <InteractiveDialog
            config={currentConfig}
            componentId={componentId}
        />
    );
});

DialogRouter.displayName = 'DialogRouter';

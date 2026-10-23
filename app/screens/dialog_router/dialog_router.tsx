// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {type IntlShape, useIntl} from 'react-intl';
import {DeviceEventEmitter} from 'react-native';

import {submitInteractiveDialog, lookupInteractiveDialog} from '@actions/remote/integrations';
import {Events} from '@constants';
import {AppCallResponseTypes} from '@constants/apps';
import {useServerUrl} from '@context/server';
import IntegrationsManager from '@managers/integrations_manager';
import AppsFormComponent from '@screens/apps_form/apps_form_component';
import {convertAppFormValuesToDialogSubmission, flattenFileFieldValues, mergeFileFieldValues} from '@utils/dialog_conversion';
import {getFullErrorMessage} from '@utils/errors';
import {InteractiveDialogAdapter} from '@utils/interactive_dialog_adapter';
import {logDebug} from '@utils/log';

export type DialogRouterProps = {
    config: InteractiveDialogConfig;
    channelId: string;
};

function dialogOptionToLookupSelectOption(opt: DialogOption): AppSelectOption {
    return {label: opt.text || '', value: opt.value || ''};
}

/**
 * Converts error to user-friendly message based on error type
 */
function getSubmissionErrorMessage(error: unknown, intl: IntlShape): string {
    if (!(error instanceof Error)) {
        return intl.formatMessage({
            id: 'interactive_dialog.submission_failed',
            defaultMessage: 'Submission failed. Please try again.',
        });
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
        return intl.formatMessage({
            id: 'interactive_dialog.submission_failed_network',
            defaultMessage: 'Submission failed due to network error. Please check your connection and try again.',
        });
    }

    if (error.message.includes('conversion') || error.message.includes('validation')) {
        return intl.formatMessage({
            id: 'interactive_dialog.submission_failed_validation',
            defaultMessage: 'Submission failed due to form validation. Please check your inputs and try again.',
        });
    }

    return intl.formatMessage({
        id: 'interactive_dialog.submission_failed_with_details',
        defaultMessage: 'Submission failed: {error}',
    }, {error: error.message});
}

const incrementNonce = (prev: number) => prev + 1;

export const DialogRouter = React.memo<DialogRouterProps>(({
    config,
    channelId,
}) => {
    const navigation = useNavigation();
    const serverUrl = useServerUrl();
    const intl = useIntl();

    // State to track current dialog config (can be updated by refresh)
    const [currentConfig, setCurrentConfig] = useState<InteractiveDialogConfig>(config);

    // State to accumulate values across multiform steps
    const [accumulatedValues, setAccumulatedValues] = useState<AppFormValues>({});

    const [accumulatedElements, setAccumulatedElements] = useState<DialogElement[]>([]);

    // Values to keep in the fields of a form returned by a field refresh, which the
    // server re-sends without them. A form returned by a submit starts from its own
    // values instead (matching webapp), so these are cleared then.
    const [prefillValues, setPrefillValues] = useState<AppFormValues>({});

    // Union of element definitions, later steps winning on a name collision so the most
    // recent declaration of a field decides how its value is converted.
    const mergeElements = useCallback((previous: DialogElement[], next: DialogElement[]) => {
        const byName = new Map<string, DialogElement>();
        for (const element of [...previous, ...next]) {
            if (element?.name) {
                byName.set(element.name, element);
            }
        }
        return Array.from(byName.values());
    }, []);

    // Per-field FILE values from earlier multiform steps (field name → comma-joined IDs).
    const [accumulatedFileFields, setAccumulatedFileFields] = useState<Record<string, string>>({});

    // Incremented when a dialog stacked on top of this one closes and this one should
    // re-fetch its form; AppsFormComponent watches it.
    const [refreshNonce, setRefreshNonce] = useState(0);

    // Incremented whenever a form replaces the current one, so a refresh-on-return
    // response that arrives after a newer form is ignored.
    const formSeqRef = useRef(0);

    // Follows each form returned by a submit or refresh, not just the opened dialog.
    const refreshOnReturn = Boolean(currentConfig?.dialog?.refresh_on_return && currentConfig.dialog.source_url);

    const onDialogClosed = useCallback((event: {serverUrl: string}) => {
        if (event.serverUrl !== serverUrl || IntegrationsManager.getManager(serverUrl).getTopDialogTriggerId() !== config?.trigger_id) {
            return;
        }
        setRefreshNonce(incrementNonce);
    }, [serverUrl, config?.trigger_id]);

    useEffect(() => {
        if (!refreshOnReturn) {
            return undefined;
        }

        const listener = DeviceEventEmitter.addListener(Events.INTERACTIVE_DIALOG_CLOSED, onDialogClosed);
        return () => listener.remove();
    }, [refreshOnReturn, onDialogClosed]);

    // Update modal title when dialog config changes
    useEffect(() => {
        if (currentConfig?.dialog?.title) {
            navigation.setOptions({
                title: currentConfig.dialog.title,
            });
        }
    }, [currentConfig?.dialog?.title, navigation]);

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

            if (isMultiform) {
                // This is a multiform submission - include ALL accumulated values.
                // Delegate to the type-aware converter (same one used by the
                // single-step path via InteractiveDialogAdapter.convertValuesToSubmission)
                // instead of maintaining a second, divergent implementation.
                const {submission: multiformSubmission, errors: conversionErrors} = convertAppFormValuesToDialogSubmission(
                    allValues,
                    mergeElements(accumulatedElements, currentConfig.dialog.elements || []),
                );

                if (conversionErrors.length > 0) {
                    logDebug('[DialogRouter.handleSubmit] multiform conversion errors', conversionErrors);
                }

                const {submission: stepSubmission} = convertAppFormValuesToDialogSubmission(values, currentConfig.dialog.elements || []);
                const mergedFileFields = mergeFileFieldValues(accumulatedFileFields, stepSubmission as {[x: string]: string}, currentConfig.dialog.elements);
                const fileIds = flattenFileFieldValues(mergedFileFields);

                legacySubmission = {
                    url: currentConfig.url || '',
                    callback_id: currentConfig.dialog.callback_id || '',
                    state: currentConfig.dialog.state || '',
                    submission: multiformSubmission as {[x: string]: string},
                    user_id: '', // Will be populated by mobile action
                    channel_id: '', // Will be populated by mobile action
                    team_id: '', // Will be populated by mobile action
                    cancelled: false,
                    ...(fileIds.length > 0 && {file_ids: fileIds}),
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

                // Accumulate values from this step for the next step, along with the
                // element definitions that describe them — the next step's response
                // replaces dialog.elements, so this is the only remaining record of how
                // these values must be converted at final submit.
                const newAccumulatedValues = {...accumulatedValues, ...values};
                setAccumulatedValues(newAccumulatedValues);
                setAccumulatedElements(mergeElements(accumulatedElements, currentConfig.dialog.elements || []));

                const {submission: stepSubmission} = convertAppFormValuesToDialogSubmission(values, currentConfig.dialog.elements || []);
                setAccumulatedFileFields(mergeFileFieldValues(accumulatedFileFields, stepSubmission as {[x: string]: string}, currentConfig.dialog.elements));

                // Use the raw dialog data from server - it's already in the correct format!
                const newDialogConfig: InteractiveDialogConfig = {
                    ...currentConfig,
                    dialog: {
                        ...rawDialogData, // Use the raw dialog response from server
                        // Preserve some properties from current config if not provided
                        icon_url: rawDialogData.icon_url || currentConfig.dialog.icon_url,
                        notify_on_cancel: rawDialogData.notify_on_cancel ?? currentConfig.dialog.notify_on_cancel,
                    },
                };

                formSeqRef.current++;
                setPrefillValues({});
                setCurrentConfig(newDialogConfig);
            } else {
            // Clear accumulated state since dialog is completing
                setPrefillValues({});
                setAccumulatedValues({});
                setAccumulatedElements([]);
                setAccumulatedFileFields({});
            }

            return result;
        } catch (error) {
            logDebug('[DialogRouter.handleSubmit]', getFullErrorMessage(error));

            return {
                error: {
                    type: AppCallResponseTypes.ERROR,
                    text: getSubmissionErrorMessage(error, intl),
                    data: {
                        errors: {},
                    },
                },
            };
        }
    }, [currentConfig, serverUrl, intl, accumulatedValues, accumulatedElements, mergeElements, accumulatedFileFields]);

    // Memoize form conversion to avoid recalculation on every render
    const appForm = useMemo(() => {
        if (!currentConfig?.dialog) {
            return null;
        }

        try {
            return InteractiveDialogAdapter.convertToAppForm(currentConfig);
        } catch (error) {
            logDebug('[DialogRouter.appForm]', getFullErrorMessage(error));
            return null;
        }
    }, [currentConfig]);

    // Helper function to find the dialog element by field name
    function findDialogElement(elements: any[], fieldName: string) {
        return elements.find((e) => e.name === fieldName);
    }

    // Create performLookupCall for dynamic select fields
    const performLookupCall = useCallback(async (field: AppField): Promise<DoAppCallResult<AppLookupResponse>> => {
        if (!field || !currentConfig?.dialog?.elements) {
            return {data: {type: 'ok', data: {items: []}}};
        }

        const elements = currentConfig.dialog.elements || [];
        const element = findDialogElement(elements, field.name ?? '');

        if (!element || element.data_source !== 'dynamic' || !element.data_source_url) {
            return {data: {type: 'ok', data: {items: []}}};
        }

        try {
            const submission: DialogSubmission = {
                url: element.data_source_url,
                callback_id: currentConfig.dialog.callback_id || '',
                state: currentConfig.dialog.state || '',
                user_id: '',
                channel_id: '',
                team_id: '',
                cancelled: false,
                submission: {
                    selected_field: element.name,
                },
            };

            const result = await lookupInteractiveDialog(serverUrl, submission);

            if (result?.data && typeof result.data === 'object' && 'items' in result.data) {
                const responseData = result.data as {items: DialogOption[]};
                if (Array.isArray(responseData.items)) {
                    return {data: {type: 'ok', data: {items: responseData.items.map(dialogOptionToLookupSelectOption)}}};
                }
            }

            if (result?.error) {
                logDebug('[DialogRouter.performLookupCall]', getFullErrorMessage(result.error));
            }
        } catch (error) {
            logDebug('[DialogRouter.performLookupCall]', getFullErrorMessage(error));
        }

        return {data: {type: 'ok', data: {items: []}}};
    }, [currentConfig, serverUrl]);

    // Posts the current values to the form's source_url as a refresh request. Dialogs
    // without a source_url keep posting to the submit url so existing integrations are
    // unaffected.
    const requestRefresh = useCallback(async (values: AppFormValues, selectedField?: string) => {
        // Merge current values with accumulated values from previous steps
        const allValues = {...accumulatedValues, ...values};

        // Convert current values back to dialog submission format
        const dialogSubmission = InteractiveDialogAdapter.convertValuesToSubmission(allValues, currentConfig);

        if (selectedField) {
            dialogSubmission.submission.selected_field = selectedField;
        }

        // Set type to indicate this is a refresh request (matching webapp)
        const refreshSubmission = {
            ...dialogSubmission,
            url: currentConfig.dialog.source_url || dialogSubmission.url,
            type: 'refresh',
        };

        // Server returns {"form": {...}, "type": "form"} format
        const result = await submitInteractiveDialog(serverUrl, refreshSubmission);
        const form = result.data && typeof result.data === 'object' && 'form' in result.data ? (result.data as {form: InteractiveDialogConfig['dialog']}).form : undefined;
        return {form, error: result.error};
    }, [accumulatedValues, currentConfig, serverUrl]);

    const makeRefreshError = useCallback((error: unknown): DoAppCallResult<FormResponseData> => {
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
    }, [intl]);

    // Create refreshOnSelect for Interactive Dialog field refresh support
    const refreshOnSelect = useCallback(async (field: AppField, values: AppFormValues): Promise<DoAppCallResult<FormResponseData>> => {
        // Early return if required parameters are missing
        if (!field || !field.name ||!currentConfig) {
            return {data: {type: 'ok'}};
        }

        try {
            const {form, error} = await requestRefresh(values, field.name);

            // Check if we got a new dialog configuration back
            if (form) {
                // Accumulate values from field refresh for preservation
                const newAccumulatedValues = {...accumulatedValues, ...values};
                setAccumulatedValues(newAccumulatedValues);
                setPrefillValues(newAccumulatedValues);

                const {submission: refreshedSubmission} = convertAppFormValuesToDialogSubmission(values, currentConfig.dialog.elements || []);
                setAccumulatedFileFields(mergeFileFieldValues(accumulatedFileFields, refreshedSubmission as {[x: string]: string}, currentConfig.dialog.elements));

                // Update the dialog config state with new form data
                const newConfig = {
                    ...currentConfig,
                    dialog: form,
                };

                formSeqRef.current++;
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
            if (error) {
                return {
                    error: {
                        type: 'error' as AppCallResponseType,
                        text: 'Field refresh failed',
                    },
                };
            }

            return {data: {type: 'ok'}};
        } catch (error) {
            return makeRefreshError(error);
        }
    }, [currentConfig, accumulatedValues, accumulatedFileFields, requestRefresh, makeRefreshError]);

    // Re-fetches the whole form without a selected field when a dialog stacked on top
    // of this one closes (refresh_on_return).
    const refreshForm = useCallback(async (values: AppFormValues): Promise<DoAppCallResult<FormResponseData>> => {
        const seq = ++formSeqRef.current;
        try {
            const {form, error} = await requestRefresh(values);

            // A submit, field refresh, or newer refresh replaced the form meanwhile.
            if (seq !== formSeqRef.current) {
                return {data: {type: 'ok'}};
            }

            if (form) {
                const newConfig = {
                    ...currentConfig,
                    dialog: form,
                };
                setCurrentConfig(newConfig);

                return {
                    data: {
                        type: 'form' as AppCallResponseType,
                        form: InteractiveDialogAdapter.convertToAppForm(newConfig),
                    },
                };
            }

            if (error) {
                logDebug('[DialogRouter.refreshForm]', getFullErrorMessage(error));
                return {
                    error: {
                        type: 'error' as AppCallResponseType,
                        text: intl.formatMessage({
                            id: 'interactive_dialog.refresh_failed',
                            defaultMessage: 'Failed to refresh form fields',
                        }),
                    },
                };
            }

            return {data: {type: 'ok'}};
        } catch (error) {
            return makeRefreshError(error);
        }
    }, [currentConfig, requestRefresh, makeRefreshError, intl]);

    // Pre-populate form fields with the values kept across a field refresh.
    // Memoized because AppsFormComponent resets its values whenever the form changes.
    const formWithValues = useMemo(() => {
        if (!appForm?.fields) {
            return null;
        }

        return {
            ...appForm,
            fields: appForm.fields.map((field) => {
                if (field.name && prefillValues[field.name] !== undefined && !field.value) {
                    return {
                        ...field,
                        value: prefillValues[field.name],
                    };
                }
                return field;
            }),
        };
    }, [appForm, prefillValues]);

    if (!formWithValues) {
        return null;
    }

    return (
        <AppsFormComponent
            form={formWithValues}
            submit={handleSubmit}
            performLookupCall={performLookupCall}
            refreshOnSelect={refreshOnSelect}
            refreshForm={refreshForm}
            refreshNonce={refreshNonce}
            channelId={channelId}
        />
    );
});

DialogRouter.displayName = 'DialogRouter';

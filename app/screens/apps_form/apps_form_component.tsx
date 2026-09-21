// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React, {useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, View} from 'react-native';
import {KeyboardAwareScrollView, type KeyboardAwareScrollViewRef} from 'react-native-keyboard-controller';
import {SafeAreaView} from 'react-native-safe-area-context';

import {handleGotoLocation} from '@actions/remote/command';
import Button from '@components/button';
import Markdown from '@components/markdown';
import {Screens} from '@constants';
import {AppCallResponseTypes, AppFieldTypes, DEFAULT_TIME_INTERVAL_MINUTES} from '@constants/apps';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useDidUpdate from '@hooks/did_update';
import {navigateBack} from '@screens/navigation';
import {filterEmptyOptions} from '@utils/apps';
import {resolveRelativeDate, parseDateInTimezone} from '@utils/date_utils';
import {mapAppFieldTypeToDialogType, getDataSourceForAppFieldType, flattenAppFields} from '@utils/dialog_utils';
import {checkDialogElementForError, checkIfErrorsMatchElements} from '@utils/integrations';
import {logDebug, logWarning} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {secureGetFromRecord} from '@utils/types';
import {typography} from '@utils/typography';

import AppsFormField from './apps_form_field';
import CollapsibleSection from './collapsible_section';
import DialogIntroductionText from './dialog_introduction_text';

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
            height: '100%',
        },
        errorContainer: {
            marginTop: 15,
            marginLeft: 15,
        },
        scrollView: {
            paddingBottom: 20,
            marginTop: 10,
        },
        errorLabel: {
            textAlign: 'left',
            color: theme.errorTextColor,
            ...typography('Body', 75, 'Regular'),
        },
        buttonContainer: {
            paddingTop: 20,
            paddingLeft: 50,
            paddingRight: 50,
        },
        buttonsWrapper: {
            marginHorizontal: 5,
        },
    };
});

function fieldsAsElements(fields?: AppField[]): DialogElement[] {
    return fields?.filter((f) => Boolean(f.name)).map((f) => {
        return {
            name: f.name || '',
            display_name: f.label || '',
            type: mapAppFieldTypeToDialogType(f.type || 'text'),
            subtype: f.subtype,
            default: f.value || '',
            placeholder: f.hint || '',
            help_text: f.description || '',
            optional: !f.is_required,
            min_length: f.min_length || 0,
            max_length: f.max_length || 0,
            data_source: getDataSourceForAppFieldType(f.type || 'text'),
            options: f.options?.map((option) => ({
                text: option.label || '',
                value: option.value || '',
            })),
            multiselect: f.multiselect,
        } as DialogElement;
    }) || [];
}

const close = () => {
    Keyboard.dismiss();
    navigateBack();
};

export type Props = {
    form: AppForm;
    refreshOnSelect: (field: AppField, values: AppFormValues, value: AppFormValue) => Promise<DoAppCallResult<FormResponseData>>;
    submit: (values: AppFormValues) => Promise<DoAppCallResult<FormResponseData>>;
    performLookupCall: (field: AppField, values: AppFormValues, value: AppFormValue) => Promise<DoAppCallResult<AppLookupResponse>>;
}

type Errors = {[name: string]: string}
const emptyErrorsState: Errors = {};

// Returns true if this field or any of its (recursively nested) children have an error.
function sectionHasError(field: AppField, errors: Errors): boolean {
    if (field.type !== AppFieldTypes.COLLAPSIBLE) {
        return Boolean(field.name && errors[field.name]);
    }
    return (field.collapsible_config?.fields || []).some((child) => sectionHasError(child, errors));
}

// Returns a partial version map — only entries for sections that contain errors,
// each incremented by 1 relative to `prev`. Extracted here so bumpErroredSections
// stays within the max-nested-callbacks lint limit.
function computeExpandBumps(
    fields: AppField[],
    errors: Errors,
    prev: Record<string, number>,
): Record<string, number> {
    const next: Record<string, number> = {};
    fields.forEach((f) => {
        if (f.type !== AppFieldTypes.COLLAPSIBLE || !f.name) {
            return;
        }
        if (sectionHasError(f, errors)) {
            next[f.name] = (prev[f.name] || 0) + 1;
        }
        Object.assign(next, computeExpandBumps(f.collapsible_config?.fields || [], errors, prev));
    });
    return next;
}

type ValuesAction = {name: string; value: AppFormValue} | {elements?: AppField[]}
function valuesReducer(state: AppFormValues, action: ValuesAction) {
    if (!('name' in action)) {
        // Merge server-provided values into existing user input so that a field
        // refresh (triggered by refresh:true) doesn't discard values the user
        // has already typed. Only fields with a new server value are overwritten.
        return {...state, ...initValues(action.elements)};
    }

    if (state[action.name] === action.value) {
        return state;
    }
    return {...state, [action.name]: action.value};
}

export function initValues(fields?: AppField[]) {
    const values: AppFormValues = {};
    fields?.forEach((field) => {
        if (field.type === AppFieldTypes.COLLAPSIBLE) {
            Object.assign(values, initValues(field.collapsible_config?.fields));
            return;
        }

        if (!field.name) {
            return;
        }

        if (field.type === AppFieldTypes.BOOL) {
            // For boolean fields, use explicit value or default to false
            values[field.name] = field.value === true || String(field.value).toLowerCase() === 'true';
        } else if (field.type === AppFieldTypes.DATETIME && field.is_required && !field.value) {
            // Auto-populate required datetime fields with current time (matching webapp)
            // Use field's location_timezone if set, so the default aligns with the displayed timezone
            const fieldTimezone = field.datetime_config?.location_timezone;
            const currentTime = fieldTimezone ? moment.tz(fieldTimezone) : moment();
            const timeInterval = field.datetime_config?.time_interval || field.time_interval || DEFAULT_TIME_INTERVAL_MINUTES;

            // Round up to next time interval
            const minutesMod = currentTime.minutes() % timeInterval;
            const defaultMoment = minutesMod === 0? currentTime.clone().seconds(0).milliseconds(0): currentTime.clone().add(timeInterval - minutesMod, 'minutes').seconds(0).milliseconds(0);

            // Clamp to min/max bounds
            if (field.min_date) {
                const resolved = resolveRelativeDate(field.min_date, fieldTimezone);
                const minMoment = parseDateInTimezone(resolved, fieldTimezone);
                if (!minMoment) {
                    logWarning('[initValues] Could not parse min_date for field', field.name, resolved);
                } else if (defaultMoment.isBefore(minMoment)) {
                    defaultMoment.set({year: minMoment.year(), month: minMoment.month(), date: minMoment.date(), hour: minMoment.hour(), minute: minMoment.minute(), second: 0});
                }
            }
            if (field.max_date) {
                const resolved = resolveRelativeDate(field.max_date, fieldTimezone);
                const maxMoment = parseDateInTimezone(resolved, fieldTimezone);
                if (!maxMoment) {
                    logWarning('[initValues] Could not parse max_date for field', field.name, resolved);
                } else if (defaultMoment.isAfter(maxMoment)) {
                    defaultMoment.set({year: maxMoment.year(), month: maxMoment.month(), date: maxMoment.date(), hour: maxMoment.hour(), minute: maxMoment.minute(), second: 0});
                }
            }

            values[field.name] = defaultMoment.toISOString();
        } else if (field.value !== undefined && field.value !== null) {
            // Use provided value for non-boolean fields
            values[field.name] = field.value;
        } else {
            // Initialize empty fields with empty string
            values[field.name] = '';
        }
    });
    return values;
}

function AppsFormComponent({
    form,
    refreshOnSelect,
    submit,
    performLookupCall,
}: Props) {
    const scrollView = useRef<KeyboardAwareScrollViewRef>(null);
    const isMountedRef = useRef(true);
    const [submitting, setSubmitting] = useState(false);
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [error, setError] = useState('');
    const [errors, setErrors] = useState(emptyErrorsState);
    const [values, dispatchValues] = useReducer(valuesReducer, form.fields, initValues);

    // Tracks per-section expand triggers. Incrementing a key forces the named
    // CollapsibleSection to open even if the user previously collapsed it.
    const [expandVersions, setExpandVersions] = useState<Record<string, number>>({});
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    useDidUpdate(() => {
        dispatchValues({elements: form.fields});
    }, [form]);

    const submitButtons = useMemo(() => {
        return flattenAppFields(form.fields || []).find((f) => f.name === form.submit_buttons);
    }, [form]);

    const updateErrors = useCallback((elements: DialogElement[], fieldErrors?: {[x: string]: string}, formError?: string): boolean => {
        let hasErrors = false;
        let hasHeaderError = false;
        if (formError) {
            hasErrors = true;
            hasHeaderError = true;
            setError(formError);
        } else {
            setError('');
        }

        if (fieldErrors && Object.keys(fieldErrors).length > 0) {
            hasErrors = true;
            if (checkIfErrorsMatchElements(fieldErrors, elements)) {
                setErrors(fieldErrors);
            } else if (!hasHeaderError) {
                hasHeaderError = true;

                // Don't expose field names or error details to prevent form structure enumeration
                setError(intl.formatMessage({
                    id: 'apps.error.responses.unknown_field_error',
                    defaultMessage: 'An error occurred with a form field. Please contact the app developer.',
                }));
            }
        }

        if (hasErrors) {
            if (hasHeaderError && scrollView.current) {
                scrollView.current.scrollTo({x: 0, y: 0});
            }
        }
        return hasErrors;
    }, [intl]);

    // Increment the expand-version for every collapsible section (at any nesting depth)
    // that contains at least one field with a current error. Causes those sections
    // to open so the user can see and fix the problem without searching manually.
    const bumpErroredSections = useCallback((fieldErrors: Errors) => {
        setExpandVersions((prev) => ({...prev, ...computeExpandBumps(form.fields || [], fieldErrors, prev)}));
    }, [form.fields]);

    const onChange = useCallback((name: string, value: AppFormValue) => {
        const field = flattenAppFields(form.fields || []).find((f) => f.name === name);
        if (!field) {
            logDebug('AppsFormComponent: Field not found for onChange', {name});
            return;
        }

        const newValues = {...values, [name]: value};

        if (field.refresh) {
            refreshOnSelect(field, newValues, value).then((res) => {
                // Check if component is still mounted before updating state
                if (!isMountedRef.current) {
                    return;
                }

                if (res.error) {
                    const errorResponse = res.error;
                    const errorMsg = errorResponse.text;
                    const newErrors = errorResponse.data?.errors;
                    const elements = fieldsAsElements(form.fields);
                    updateErrors(elements, newErrors, errorMsg);
                    return;
                }

                const callResponse = res.data!;
                switch (callResponse.type) {
                    case AppCallResponseTypes.FORM:
                        return;
                    case AppCallResponseTypes.OK:
                    case AppCallResponseTypes.NAVIGATE:
                        updateErrors([], undefined, intl.formatMessage({
                            id: 'apps.error.responses.unexpected_type',
                            defaultMessage: 'App response type was not expected. Response type: {type}',
                        }, {
                            type: callResponse.type,
                        }));
                        return;
                    default:
                        updateErrors([], undefined, intl.formatMessage({
                            id: 'apps.error.responses.unknown_type',
                            defaultMessage: 'App response type not supported. Response type: {type}.',
                        }, {
                            type: callResponse.type,
                        }));
                }
            }).catch((err) => {
                // Handle promise rejection gracefully
                if (isMountedRef.current) {
                    logWarning('RefreshOnSelect failed:', err);
                }
            });
        }

        dispatchValues({name, value});
    }, [form, values, refreshOnSelect, updateErrors, intl]);

    // Memoize elements conversion for performance; flatten collapsible containers to leaf fields
    const elements = useMemo(() => fieldsAsElements(flattenAppFields(form.fields || [])), [form.fields]);

    // Memoize filtered fields to avoid recalculation on every render
    const visibleFields = useMemo(() =>
        form.fields?.filter((f) => f.name !== form.submit_buttons) || [],
    [form.fields, form.submit_buttons],
    );

    const handleSubmit = useCallback(async (button?: string) => {
        if (submitting) {
            return;
        }

        const fieldErrors: {[name: string]: string} = {};
        let hasErrors = false;
        elements?.forEach((element) => {
            const newError = checkDialogElementForError(
                element,
                element.name === form.submit_buttons ? button : secureGetFromRecord(values, element.name),
                intl,
            );
            if (newError) {
                hasErrors = true;
                fieldErrors[element.name] = newError;
            }
        });

        if (hasErrors) {
            setErrors(fieldErrors);
            bumpErroredSections(fieldErrors);
            return;
        }

        const submission = {...values};

        if (button && form.submit_buttons) {
            submission[form.submit_buttons] = button;
        }

        setSubmitting(true);

        const res = await submit(submission);

        // Check if component is still mounted before updating state
        if (!isMountedRef.current) {
            return;
        }

        if (res.error) {
            const errorResponse = res.error;
            const errorMessage = errorResponse.text;
            hasErrors = updateErrors(elements, errorResponse.data?.errors, errorMessage);
            if (!hasErrors) {
                close();
                return;
            }
            if (errorResponse.data?.errors) {
                bumpErroredSections(errorResponse.data.errors);
            }
            setSubmitting(false);
            return;
        }

        setError('');
        setErrors(emptyErrorsState);
        setExpandVersions({});

        const callResponse = res.data!;
        switch (callResponse.type) {
            case AppCallResponseTypes.OK:
                close();
                return;
            case AppCallResponseTypes.NAVIGATE:
                close();
                handleGotoLocation(serverUrl, intl, callResponse.navigate_to_url!);
                return;
            case AppCallResponseTypes.FORM:
                setSubmitting(false);
                return;
            default:
                updateErrors([], undefined, intl.formatMessage({
                    id: 'apps.error.responses.unknown_type',
                    defaultMessage: 'App response type not supported. Response type: {type}.',
                }, {
                    type: callResponse.type,
                }));
                setSubmitting(false);
        }
    }, [elements, form, values, submit, submitting, updateErrors, bumpErroredSections, serverUrl, intl]);

    const performLookup = useCallback(async (name: string, userInput: string): Promise<AppSelectOption[]> => {
        const field = flattenAppFields(form.fields || []).find((f) => f.name === name);
        if (!field?.name) {
            return [];
        }

        const res = await performLookupCall(field, values, userInput);

        // Check if component is still mounted before updating state
        if (!isMountedRef.current) {
            return [];
        }

        if (res.error) {
            const errorResponse = res.error;
            const errMsg = errorResponse.text || intl.formatMessage({
                id: 'apps.error.unknown',
                defaultMessage: 'Unknown error occurred.',
            });
            setErrors({[field.name]: errMsg});
            return [];
        }

        const callResp = res.data!;
        switch (callResp.type) {
            case AppCallResponseTypes.OK: {
                let items = callResp.data?.items || [];
                items = items.filter(filterEmptyOptions);
                return items;
            }
            case AppCallResponseTypes.FORM:
            case AppCallResponseTypes.NAVIGATE: {
                const errMsg = intl.formatMessage({
                    id: 'apps.error.responses.unexpected_type',
                    defaultMessage: 'App response type was not expected. Response type: {type}',
                }, {
                    type: callResp.type,
                },
                );
                setErrors({[field.name]: errMsg});
                return [];
            }
            default: {
                const errMsg = intl.formatMessage({
                    id: 'apps.error.responses.unknown_type',
                    defaultMessage: 'App response type not supported. Response type: {type}.',
                }, {
                    type: callResp.type,
                },
                );
                setErrors({[field.name]: errMsg});
                return [];
            }
        }
    }, [form, values, performLookupCall, intl]);

    // Cleanup on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const renderField = useCallback((field: AppField, isFirstField: boolean, depth = 0): React.ReactNode => {
        if (field.type === AppFieldTypes.COLLAPSIBLE) {
            const childFields = (field.collapsible_config?.fields || []).filter((f) => f.name !== form.submit_buttons);

            // Don't render a toggle for a section with no visible fields (matches
            // CollapsibleBlock, which returns null when it has no content).
            if (childFields.length === 0) {
                return null;
            }
            return (
                <CollapsibleSection
                    key={field.name}
                    label={field.label || field.name || ''}
                    initiallyExpanded={field.collapsible_config?.expanded ?? true}
                    bordered={field.collapsible_config?.bordered ?? true}
                    depth={depth}
                    hasError={sectionHasError(field, errors)}
                    forceExpandVersion={expandVersions[field.name ?? '']}
                >
                    {childFields.map((child, i) => renderField(child, isFirstField && i === 0, depth + 1))}
                </CollapsibleSection>
            );
        }
        if (!field.name) {
            return null;
        }
        const value = secureGetFromRecord(values, field.name);
        return (
            <AppsFormField
                field={field}
                key={field.name}
                name={field.name}
                errorText={secureGetFromRecord(errors, field.name)}
                value={value || ''}
                performLookup={performLookup}
                onChange={onChange}
            />
        );
    }, [values, errors, expandVersions, performLookup, onChange, form.submit_buttons]);

    return (
        <SafeAreaView
            testID='interactive_dialog.screen'
            style={style.container}
        >
            <KeyboardAwareScrollView
                ref={scrollView}
                keyboardDismissMode='interactive'
                keyboardShouldPersistTaps='handled'
                contentContainerStyle={style.scrollView}
                mode='layout'
                testID='interactive_dialog.scroll_view'
            >
                {error && (
                    <View style={style.errorContainer} >
                        <Markdown
                            baseTextStyle={style.errorLabel}
                            location={Screens.APPS_FORM}
                            disableAtMentions={true}
                            value={error}
                            theme={theme}
                        />
                    </View>
                )}
                {form.header &&
                    <DialogIntroductionText
                        value={form.header}
                    />
                }
                {visibleFields.map((field, index) => renderField(field, index === 0))}
                <View
                    style={style.buttonsWrapper}
                >
                    {submitButtons?.options?.length ? submitButtons.options.map((o) => (
                        <View
                            key={o.value}
                            style={style.buttonContainer}
                        >
                            <Button
                                onPress={() => handleSubmit(o.value)}
                                theme={theme}
                                size='lg'
                                text={o.label || ''}
                            />
                        </View>
                    )) : (
                        <View style={style.buttonContainer}>
                            <Button
                                onPress={() => handleSubmit()}
                                disabled={submitting}
                                showLoader={submitting}
                                theme={theme}
                                size='lg'
                                testID='interactive_dialog.submit.button'
                                text={form.submit_label || intl.formatMessage({id: 'interactive_dialog.submit', defaultMessage: 'Submit'})}
                            />
                        </View>
                    )}
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

export default AppsFormComponent;

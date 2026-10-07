// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import moment from 'moment-timezone';
import React, {useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, View} from 'react-native';
import {KeyboardAwareScrollView, type KeyboardAwareScrollViewRef} from 'react-native-keyboard-controller';
import {SafeAreaView} from 'react-native-safe-area-context';

import {handleGotoLocation} from '@actions/remote/command';
import Button from '@components/button';
import Markdown from '@components/markdown';
import NavigationButton from '@components/navigation_button';
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

// A section's identity for expand tracking and React keys: its name when it has
// one, otherwise a stable path derived from its position in the field tree. The
// path lets unnamed sections participate in force-expand and gives sibling
// sections distinct React keys (an unnamed section would otherwise key on
// `undefined` and collide with its unnamed siblings). Both this helper and
// renderField must derive the path the same way over the same (unfiltered) arrays.
function sectionKeyFor(field: AppField, path: string): string {
    return field.name || path;
}

function childPath(parentPath: string, index: number): string {
    return parentPath === '' ? `${index}` : `${parentPath}/${index}`;
}

// Returns a partial version map — only entries for sections that contain errors,
// each incremented by 1 relative to `prev`. Extracted here so bumpErroredSections
// stays within the max-nested-callbacks lint limit.
function computeExpandBumps(
    fields: AppField[],
    errors: Errors,
    prev: Record<string, number>,
    parentPath = '',
): Record<string, number> {
    const next: Record<string, number> = {};
    fields.forEach((f, index) => {
        if (f.type !== AppFieldTypes.COLLAPSIBLE) {
            return;
        }

        // Bump this section if its subtree holds an error, then always recurse: a
        // section may itself be error-free while a nested section still needs to open.
        const path = childPath(parentPath, index);
        if (sectionHasError(f, errors)) {
            const key = sectionKeyFor(f, path);
            next[key] = (prev[key] || 0) + 1;
        }
        Object.assign(next, computeExpandBumps(f.collapsible_config?.fields || [], errors, prev, path));
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

    // Synchronous in-flight guard. `submitting` state only updates after a re-render,
    // so a rapid double-tap on the header button would run the same stale closure twice
    // and submit twice. The ref blocks the second call before any await.
    const submittingRef = useRef(false);
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
    const navigation = useNavigation();

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

                    // Flatten collapsible containers to leaf fields (matching the memoized
                    // `elements` above) so a server error on a nested field matches its
                    // element instead of falling back to the generic unknown-field message.
                    const elements = fieldsAsElements(flattenAppFields(form.fields || []));
                    updateErrors(elements, newErrors, errorMsg);

                    // Open any collapsed section that now holds a refreshed field error so
                    // the user can see and correct it (mirrors the submit-validation path).
                    if (newErrors) {
                        bumpErroredSections(newErrors);
                    }
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
    }, [form, values, refreshOnSelect, updateErrors, bumpErroredSections, intl]);

    // Memoize elements conversion for performance; flatten collapsible containers to leaf fields
    const elements = useMemo(() => fieldsAsElements(flattenAppFields(form.fields || [])), [form.fields]);

    const handleSubmit = useCallback(async (button?: string) => {
        if (submittingRef.current) {
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

        submittingRef.current = true;
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
            submittingRef.current = false;
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
                submittingRef.current = false;
                setSubmitting(false);
                return;
            default:
                updateErrors([], undefined, intl.formatMessage({
                    id: 'apps.error.responses.unknown_type',
                    defaultMessage: 'App response type not supported. Response type: {type}.',
                }, {
                    type: callResponse.type,
                }));
                submittingRef.current = false;
                setSubmitting(false);
        }
    }, [elements, form, values, submit, updateErrors, bumpErroredSections, serverUrl, intl]);

    // Present the default submit action in the modal header (matching edit_profile /
    // custom_status) so it stays above the keyboard and is always reachable. Forms
    // that define their own submit_buttons keep those inline in the body instead.
    const hasSubmitButtonsField = Boolean(submitButtons?.options?.length);
    const submitLabel = form.submit_label || intl.formatMessage({id: 'interactive_dialog.submit', defaultMessage: 'Submit'});
    useEffect(() => {
        if (hasSubmitButtonsField) {
            navigation.setOptions({headerRight: undefined});
            return;
        }
        navigation.setOptions({
            headerRight: () => (

                // The View testID constrains the Detox hit area so a header tap lands
                // on the button rather than the title (see edit_profile.save.button).
                // Match the app's header-action convention (NavigationButton, tinted
                // with sidebarHeaderTextColor, no filled background) — a filled circle
                // here collides with iOS 26's bar-button glass capsule.
                <View testID='interactive_dialog.submit.button'>
                    <NavigationButton
                        onPress={() => handleSubmit()}
                        disabled={submitting}
                        iconName='check'
                        iconSize={24}
                        accessibilityLabel={submitLabel}
                    />
                </View>
            ),
        });
    }, [navigation, hasSubmitButtonsField, submitting, submitLabel, handleSubmit, style]);

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

    // `path` is the section's position in the (unfiltered) field tree; it must be
    // derived the same way as in computeExpandBumps so force-expand keys line up.
    // Children are mapped over the raw array (not pre-filtered) so those indices
    // stay aligned — filtered-out fields simply render as null.
    const renderField = useCallback((field: AppField, path: string, depth = 0): React.ReactNode => {
        if (field.type === AppFieldTypes.COLLAPSIBLE) {
            const rawChildren = field.collapsible_config?.fields || [];
            const renderedChildren = rawChildren.map((child, i) => renderField(child, childPath(path, i), depth + 1));

            // Don't render a toggle for a section with no visible fields (matches
            // CollapsibleBlock, which returns null when it has no content). A section
            // holding only the submit_buttons field or empty nested sections collapses away.
            if (!renderedChildren.some(Boolean)) {
                return null;
            }
            const key = sectionKeyFor(field, path);
            return (
                <CollapsibleSection
                    key={key}
                    label={field.label || field.name || ''}
                    initiallyExpanded={field.collapsible_config?.expanded ?? true}
                    bordered={field.collapsible_config?.bordered ?? true}
                    depth={depth}
                    hasError={sectionHasError(field, errors)}
                    forceExpandVersion={expandVersions[key]}
                >
                    {renderedChildren}
                </CollapsibleSection>
            );
        }
        if (!field.name || field.name === form.submit_buttons) {
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
                {(form.fields || []).map((field, index) => renderField(field, childPath('', index)))}
                {hasSubmitButtonsField && (
                    <View
                        style={style.buttonsWrapper}
                    >
                        {submitButtons?.options?.map((o) => (
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
                        ))}
                    </View>
                )}
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

export default AppsFormComponent;

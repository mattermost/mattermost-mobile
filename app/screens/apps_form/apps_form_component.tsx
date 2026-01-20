// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
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
import {AppCallResponseTypes} from '@constants/apps';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useDidUpdate from '@hooks/did_update';
import {navigateBack} from '@screens/navigation';
import {filterEmptyOptions} from '@utils/apps';
import {checkDialogElementForError, checkIfErrorsMatchElements} from '@utils/integrations';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {secureGetFromRecord} from '@utils/types';

import DialogIntroductionText from '../interactive_dialog/dialog_introduction_text';

import AppsFormField from './apps_form_field';

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
            height: '100%',
        },
        errorContainer: {
            marginTop: 15,
            marginLeft: 15,
            fontSize: 14,
            fontWeight: 'bold',
        },
        scrollView: {
            paddingBottom: 20,
            marginTop: 10,
        },
        errorLabel: {
            fontSize: 12,
            textAlign: 'left',
            color: (theme.errorTextColor || '#DA4A4A'),
        },
        buttonContainer: {
            paddingTop: 20,
            paddingLeft: 50,
            paddingRight: 50,
        },
    };
});

function fieldsAsElements(fields?: AppField[]): DialogElement[] {
    return fields?.map((f) => ({
        name: f.name,
        type: f.type,
        subtype: f.subtype,
        optional: !f.is_required,
    } as DialogElement)) || [];
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

type ValuesAction = {name: string; value: AppFormValue} | {elements?: AppField[]}
function valuesReducer(state: AppFormValues, action: ValuesAction) {
    if (!('name' in action)) {
        return initValues(action.elements);
    }

    if (state[action.name] === action.value) {
        return state;
    }
    return {...state, [action.name]: action.value};
}

function initValues(fields?: AppField[]) {
    const values: AppFormValues = {};
    fields?.forEach((e) => {
        if (!e.name) {
            return;
        }
        if (e.type === 'bool') {
            values[e.name] = (e.value === true || String(e.value).toLowerCase() === 'true');
        } else if (e.value) {
            values[e.name] = e.value;
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
    const [submitting, setSubmitting] = useState(false);
    const navigation = useNavigation();
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [error, setError] = useState('');
    const [errors, setErrors] = useState(emptyErrorsState);
    const [values, dispatchValues] = useReducer(valuesReducer, form.fields, initValues);
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    useDidUpdate(() => {
        dispatchValues({elements: form.fields});
    }, [form]);

    const submitButtons = useMemo(() => {
        return form.fields && form.fields.find((f) => f.name === form.submit_buttons);
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
                const field = Object.keys(fieldErrors)[0];
                setError(intl.formatMessage({
                    id: 'apps.error.responses.unknown_field_error',
                    defaultMessage: 'Received an error for an unknown field. Field name: `{field}`. Error: `{error}`.',
                }, {
                    field,
                    error: fieldErrors[field],
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

    const onChange = useCallback((name: string, value: AppFormValue) => {
        const field = form.fields?.find((f) => f.name === name);
        if (!field) {
            return;
        }

        const newValues = {...values, [name]: value};

        if (field.refresh) {
            refreshOnSelect(field, newValues, value).then((res) => {
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
            });
        }

        dispatchValues({name, value});
    }, [form, values, refreshOnSelect, updateErrors, intl]);

    const handleSubmit = useCallback(async (button?: string) => {
        if (submitting) {
            return;
        }

        const {fields} = form;
        const fieldErrors: {[name: string]: string} = {};

        const elements = fieldsAsElements(fields);
        let hasErrors = false;
        elements?.forEach((element) => {
            const newError = checkDialogElementForError(
                element,
                element.name === form.submit_buttons ? button : secureGetFromRecord(values, element.name),
            );
            if (newError) {
                hasErrors = true;
                fieldErrors[element.name] = intl.formatMessage({id: newError.id, defaultMessage: newError.defaultMessage}, newError.values);
            }
        });

        if (hasErrors) {
            setErrors(fieldErrors);
            return;
        }

        const submission = {...values};

        if (button && form.submit_buttons) {
            submission[form.submit_buttons] = button;
        }

        setSubmitting(true);

        const res = await submit(submission);

        if (res.error) {
            const errorResponse = res.error;
            const errorMessage = errorResponse.text;
            hasErrors = updateErrors(elements, errorResponse.data?.errors, errorMessage);
            if (!hasErrors) {
                close();
                return;
            }
            setSubmitting(false);
            return;
        }

        setError('');
        setErrors(emptyErrorsState);

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
    }, [form, values, submit, submitting, updateErrors, serverUrl, intl]);

    const performLookup = useCallback(async (name: string, userInput: string): Promise<AppSelectOption[]> => {
        const field = form.fields?.find((f) => f.name === name);
        if (!field?.name) {
            return [];
        }

        const res = await performLookupCall(field, values, userInput);
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

    useEffect(() => {
        if (submitButtons) {
            navigation.setOptions({
                headerRight: () => (
                    <NavigationButton
                        onPress={handleSubmit}
                        disabled={submitting}
                        testID='interactive_dialog.submit.button'
                        text={intl.formatMessage({id: 'interactive_dialog.submit', defaultMessage: 'Submit'})}
                    />
                ),
            });
        }
    }, [handleSubmit, intl, navigation, submitButtons, submitting]);

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
                {form.fields && form.fields.filter((f) => f.name !== form.submit_buttons).map((field) => {
                    if (!field.name) {
                        return null;
                    }
                    const value = secureGetFromRecord(values, field.name);
                    if (!value) {
                        return null;
                    }
                    return (
                        <AppsFormField
                            field={field}
                            key={field.name}
                            name={field.name}
                            errorText={secureGetFromRecord(errors, field.name)}
                            value={value}
                            performLookup={performLookup}
                            onChange={onChange}
                        />
                    );
                })}
                <View
                    style={{marginHorizontal: 5}}
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
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

export default AppsFormComponent;

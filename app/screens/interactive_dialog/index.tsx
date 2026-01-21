// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect, useReducer, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard} from 'react-native';
import {KeyboardAwareScrollView, type KeyboardAwareScrollViewRef} from 'react-native-keyboard-controller';
import {SafeAreaView, type Edge} from 'react-native-safe-area-context';

import {submitInteractiveDialog} from '@actions/remote/integrations';
import ErrorText from '@components/error_text';
import NavigationButton from '@components/navigation_button';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useBackNavigation from '@hooks/navigate_back';
import {navigateBack} from '@screens/navigation';
import {checkDialogElementForError, checkIfErrorsMatchElements} from '@utils/integrations';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {secureGetFromRecord} from '@utils/types';

import DialogElement from './dialog_element';
import DialogIntroductionText from './dialog_introduction_text';

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
            flex: 1,
        },
        errorContainer: {
            marginTop: 15,
            marginLeft: 15,
            fontSize: 14,
            fontWeight: 'bold',
        },
        scrollView: {
            paddingBottom: 20,
            paddingTop: 10,
        },
    };
});

export type InteractiveDialogScreenProps = {
    config: InteractiveDialogConfig;
}

const close = () => {
    Keyboard.dismiss();
    navigateBack();
};

const edges: Edge[] = ['right', 'bottom', 'left'];

type Errors = {[name: string]: string}
const emptyErrorsState: Errors = {};

type Values = {[name: string]: string|number|boolean}
type ValuesAction = {name: string; value: string|number|boolean}
function valuesReducer(state: Values, action: ValuesAction) {
    if (state[action.name] === action.value) {
        return state;
    }
    return {...state, [action.name]: action.value};
}
function initValues(elements?: DialogElement[]) {
    const values: Values = {};
    elements?.forEach((e) => {
        if (e.type === 'bool') {
            values[e.name] = (e.default === true || String(e.default).toLowerCase() === 'true');
        } else if (e.default) {
            values[e.name] = e.default;
        }
    });
    return values;
}

const emptyElementList: DialogElement[] = [];
function InteractiveDialog({
    config: {
        url,
        dialog: {
            callback_id: callbackId,
            introduction_text: introductionText,
            elements = emptyElementList,
            notify_on_cancel: notifyOnCancel,
            state,
            submit_label: submitLabel,
        },
    },
}: InteractiveDialogScreenProps) {
    const navigation = useNavigation();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState(emptyErrorsState);
    const [values, dispatchValues] = useReducer(valuesReducer, elements, initValues);
    const [submitting, setSubmitting] = useState(false);
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const scrollView = React.useRef<KeyboardAwareScrollViewRef>(null);

    const onChange = useCallback((name: string, value: string | number | boolean) => {
        dispatchValues({name, value});
    }, []);

    const onBackPress = useCallback(() => {
        if (notifyOnCancel) {
            submitInteractiveDialog(serverUrl, {
                url,
                callback_id: callbackId,
                state,
                cancelled: true,
            } as DialogSubmission);
        }
    }, [notifyOnCancel, serverUrl, url, callbackId, state]);

    const handleSubmit = useCallback(async () => {
        const newErrors: Errors = {};
        const submission = {...values};
        let hasErrors = false;
        if (elements) {
            elements.forEach((elem) => {
                // Delete empty number fields before submissions
                if (elem.type === 'text' && elem.subtype === 'number' && secureGetFromRecord(submission, elem.name) === '') {
                    delete submission[elem.name];
                }

                const newError = checkDialogElementForError(elem, secureGetFromRecord(submission, elem.name));
                if (newError) {
                    newErrors[elem.name] = intl.formatMessage({id: newError.id, defaultMessage: newError.defaultMessage}, newError.values);
                    hasErrors = true;
                }
            });
        }

        setErrors(hasErrors ? newErrors : emptyErrorsState);

        if (hasErrors) {
            return;
        }

        const dialog = {
            url,
            callback_id: callbackId,
            state,
            submission,
        } as DialogSubmission;

        setSubmitting(true);
        const {data} = await submitInteractiveDialog(serverUrl, dialog);

        if (data) {
            if (data.errors &&
                Object.keys(data.errors).length >= 0 &&
                checkIfErrorsMatchElements(data.errors, elements)
            ) {
                hasErrors = true;
                setErrors(data.errors);
            }

            if (data.error) {
                hasErrors = true;
                setError(data.error);
                scrollView.current?.scrollTo({x: 0, y: 0, animated: true});
            } else {
                setError('');
            }
        }

        if (hasErrors) {
            setSubmitting(false);
        } else {
            close();
        }
    }, [elements, url, callbackId, state, values, serverUrl, intl]);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <NavigationButton
                    onPress={handleSubmit}
                    disabled={submitting}
                    testID='interactive_dialog.submit.button'
                    text={submitLabel || intl.formatMessage({id: 'interactive_dialog.submit', defaultMessage: 'Submit'})}
                />
            ),
        });
    }, [navigation, handleSubmit, submitting, submitLabel, intl]);

    useBackNavigation(onBackPress);
    useAndroidHardwareBackHandler(Screens.INTERACTIVE_DIALOG, close);

    return (
        <SafeAreaView
            testID='interactive_dialog.screen'
            style={style.container}
            edges={edges}
        >
            <KeyboardAwareScrollView
                ref={scrollView}
                bounces={false}
                contentContainerStyle={style.scrollView}
                scrollToOverflowEnabled={true}
                keyboardDismissMode='interactive'
                keyboardShouldPersistTaps='handled'
            >
                {Boolean(error) && (
                    <ErrorText
                        testID='interactive_dialog.error.text'
                        textStyle={style.errorContainer}
                        error={error}
                    />
                )}
                {Boolean(introductionText) &&
                <DialogIntroductionText
                    value={introductionText}
                />
                }
                {Boolean(elements) && elements.map((e) => {
                    const value = secureGetFromRecord(values, e.name);
                    return (
                        <DialogElement
                            key={'dialogelement' + e.name}
                            displayName={e.display_name}
                            name={e.name}
                            type={e.type}
                            subtype={e.subtype}
                            helpText={e.help_text}
                            errorText={secureGetFromRecord(errors, e.name)}
                            placeholder={e.placeholder}
                            maxLength={e.max_length}
                            dataSource={e.data_source}
                            optional={e.optional}
                            options={e.options}
                            value={value}
                            onChange={onChange}
                        />
                    );
                })}
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

export default InteractiveDialog;

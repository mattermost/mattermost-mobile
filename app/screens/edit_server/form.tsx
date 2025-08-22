// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type MutableRefObject, useCallback, useEffect, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Keyboard, Platform, Pressable, useWindowDimensions, View} from 'react-native';

import Button from '@components/button';
import CompassIcon from '@components/compass_icon';
import FloatingTextInput, {type FloatingTextInputRef} from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import {useIsTablet} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {removeProtocol, stripTrailingSlashes} from '@utils/url';

import type {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

type Props = {
    buttonDisabled: boolean;
    connecting: boolean;
    displayName?: string;
    displayNameError?: string;
    handleUpdate: () => void;
    handleDisplayNameTextChanged: (text: string) => void;
    handlePreauthSecretTextChanged: (text: string) => void;
    handlePreauthSecretFocus: () => void;
    keyboardAwareRef: MutableRefObject<KeyboardAwareScrollView | null>;
    serverUrl: string;
    preauthSecret?: string;
    theme: Theme;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    formContainer: {
        alignItems: 'center',
        maxWidth: 600,
        width: '100%',
        paddingHorizontal: 20,
    },
    fullWidth: {
        width: '100%',
    },
    error: {
        marginBottom: 18,
    },
    chooseText: {
        alignSelf: 'flex-start',
        color: changeOpacity(theme.centerChannelColor, 0.64),
        marginTop: 8,
        ...typography('Body', 75, 'Regular'),
    },
    buttonContainer: {
        width: '100%',
        marginTop: 32,
    },
    advancedOptionsContainer: {
        width: '100%',
        marginTop: 16,
    },
    advancedOptionsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingVertical: 12,
        paddingHorizontal: 4,
    },
    advancedOptionsTitle: {
        color: theme.linkColor,
        ...typography('Body', 200, 'SemiBold'),
    },
    advancedOptionsContent: {
        width: '100%',
    },
}));

const messages = defineMessages({
    save: {
        id: 'edit_server.save',
        defaultMessage: 'Save',
    },
    saving: {
        id: 'edit_server.saving',
        defaultMessage: 'Saving',
    },
    advancedOptions: {
        id: 'mobile.components.select_server_view.advancedOptions',
        defaultMessage: 'Advanced Options',
    },
    preauthSecret: {
        id: 'mobile.components.select_server_view.sharedSecret',
        defaultMessage: 'Pre-authentication secret',
    },
    preauthSecretHelp: {
        id: 'edit_server.sharedSecretHelp',
        defaultMessage: 'Type to replace current secret, clear field to remove secret',
    },
});

const EditServerForm = ({
    buttonDisabled,
    connecting,
    displayName = '',
    displayNameError,
    handleUpdate,
    handleDisplayNameTextChanged,
    handlePreauthSecretTextChanged,
    handlePreauthSecretFocus,
    keyboardAwareRef,
    serverUrl,
    preauthSecret = '',
    theme,
}: Props) => {
    const {formatMessage} = useIntl();
    const isTablet = useIsTablet();
    const dimensions = useWindowDimensions();
    const displayNameRef = useRef<FloatingTextInputRef>(null);
    const preauthSecretRef = useRef<FloatingTextInputRef>(null);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const styles = getStyleSheet(theme);

    const onBlur = useCallback(() => {
        if (Platform.OS === 'ios') {
            const reset = !displayNameRef.current?.isFocused() && !preauthSecretRef.current?.isFocused();
            if (reset) {
                keyboardAwareRef.current?.scrollToPosition(0, 0);
            }
        }
    }, [keyboardAwareRef]);

    const toggleAdvancedOptions = useCallback(() => {
        setShowAdvancedOptions((prev) => !prev);
    }, [setShowAdvancedOptions]);

    const onUpdate = useCallback(() => {
        Keyboard.dismiss();
        handleUpdate();
    }, [handleUpdate]);

    const onDisplayNameSubmit = useCallback(() => {
        if (showAdvancedOptions) {
            // Move to the next field if advanced options are shown
            preauthSecretRef.current?.focus();
        } else {
            onUpdate();
        }
    }, [showAdvancedOptions, onUpdate]);

    const onFocus = useCallback(() => {
        // For iOS we set the position of the input instead of
        // having the KeyboardAwareScrollView figure it out by itself
        // on Android KeyboardAwareScrollView does nothing as is handled
        // by the OS
        if (Platform.OS === 'ios') {
            let offsetY = 160;
            if (isTablet) {
                const {width, height} = dimensions;
                const isLandscape = width > height;
                offsetY = isLandscape ? 230 : 100;
            }
            requestAnimationFrame(() => {
                keyboardAwareRef.current?.scrollToPosition(0, offsetY);
            });
        }
    }, [dimensions, isTablet, keyboardAwareRef]);

    const onPreauthSecretFocus = useCallback(() => {
        handlePreauthSecretFocus();
        onFocus();
    }, [handlePreauthSecretFocus, onFocus]);

    useEffect(() => {
        if (Platform.OS === 'ios' && isTablet) {
            if (displayNameRef.current?.isFocused()) {
                onFocus();
            } else {
                keyboardAwareRef.current?.scrollToPosition(0, 0);
            }
        }
    }, [onFocus]);

    const saveButtonTestId = buttonDisabled ? 'edit_server_form.save.button.disabled' : 'edit_server_form.save.button';

    return (
        <View style={styles.formContainer}>
            <View style={[styles.fullWidth, displayNameError?.length ? styles.error : undefined]}>
                <FloatingTextInput
                    autoCorrect={false}
                    autoCapitalize={'none'}
                    enablesReturnKeyAutomatically={true}
                    error={displayNameError}
                    label={formatMessage({
                        id: 'mobile.components.select_server_view.displayName',
                        defaultMessage: 'Display Name',
                    })}
                    onBlur={onBlur}
                    onChangeText={handleDisplayNameTextChanged}
                    onFocus={onFocus}
                    onSubmitEditing={onDisplayNameSubmit}
                    ref={displayNameRef}
                    returnKeyType={showAdvancedOptions ? 'next' : 'done'}
                    spellCheck={false}
                    testID='edit_server_form.server_display_name.input'
                    theme={theme}
                    value={displayName}
                />
            </View>
            {!displayNameError &&
            <FormattedText
                defaultMessage={'Server: {url}'}
                id={'edit_server.display_help'}
                style={styles.chooseText}
                testID={'edit_server_form.display_help'}
                values={{url: removeProtocol(stripTrailingSlashes(serverUrl))}}
            />
            }

            <View style={styles.advancedOptionsContainer}>
                <Pressable
                    onPress={toggleAdvancedOptions}
                    style={styles.advancedOptionsHeader}
                    testID='edit_server_form.advanced_options.toggle'
                >
                    <CompassIcon
                        name={showAdvancedOptions ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={theme.linkColor}
                    />
                    <FormattedText
                        {...messages.advancedOptions}
                        style={styles.advancedOptionsTitle}
                    />
                </Pressable>

                {showAdvancedOptions && (
                    <View style={styles.advancedOptionsContent}>
                        <FloatingTextInput
                            autoCorrect={false}
                            autoCapitalize={'none'}
                            enablesReturnKeyAutomatically={true}
                            label={formatMessage(messages.preauthSecret)}
                            onBlur={onBlur}
                            onChangeText={handlePreauthSecretTextChanged}
                            onFocus={onPreauthSecretFocus}
                            onSubmitEditing={onUpdate}
                            ref={preauthSecretRef}
                            returnKeyType='done'
                            secureTextEntry={true}
                            spellCheck={false}
                            testID='edit_server_form.preauth_secret.input'
                            theme={theme}
                            value={preauthSecret}
                        />
                        <FormattedText
                            {...messages.preauthSecretHelp}
                            style={styles.chooseText}
                            testID='edit_server_form.preauth_secret_help'
                        />
                    </View>
                )}
            </View>
            <View style={styles.buttonContainer}>
                <Button
                    disabled={buttonDisabled || connecting}
                    onPress={onUpdate}
                    testID={saveButtonTestId}
                    size='lg'
                    theme={theme}
                    text={formatMessage(connecting ? messages.saving : messages.save)}
                    showLoader={connecting}
                />
            </View>
        </View>
    );
};

export default EditServerForm;

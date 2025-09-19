// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type RefObject, useCallback, useEffect, useRef} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Keyboard, Pressable, View} from 'react-native';
import Animated, {FlipInEasyX, FlipOutXUp, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import Button from '@components/button';
import CompassIcon from '@components/compass_icon';
import FloatingTextInput, {type FloatingTextInputRef} from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import {useAvoidKeyboard} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

type Props = {
    autoFocus?: boolean;
    buttonDisabled: boolean;
    connecting: boolean;
    displayName?: string;
    displayNameError?: string;
    disableServerUrl: boolean;
    handleConnect: () => void;
    handleDisplayNameTextChanged: (text: string) => void;
    handlePreauthSecretTextChanged: (text: string) => void;
    handleUrlTextChanged: (text: string) => void;
    keyboardAwareRef: RefObject<KeyboardAwareScrollView>;
    preauthSecret?: string;
    preauthSecretError?: string;
    setShowAdvancedOptions: React.Dispatch<React.SetStateAction<boolean>>;
    showAdvancedOptions: boolean;
    theme: Theme;
    url?: string;
    urlError?: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    formContainer: {
        alignItems: 'center',
        maxWidth: 600,
        width: '100%',
        paddingHorizontal: 20,
    },
    enterServer: {
        marginBottom: 24,
    },
    fullWidth: {
        width: '100%',
    },
    chooseText: {
        alignSelf: 'flex-start',
        color: changeOpacity(theme.centerChannelColor, 0.64),
        marginTop: 8,
        ...typography('Body', 75, 'Regular'),
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
        ...typography('Body', 75, 'SemiBold'),
    },
    advancedOptionsContent: {
        width: '100%',
    },
    connectButtonContainer: {
        width: '100%',
        marginTop: 32,
        marginLeft: 20,
        marginRight: 20,
    },
}));

const messages = defineMessages({
    connect: {
        id: 'mobile.components.select_server_view.connect',
        defaultMessage: 'Connect',
    },
    connecting: {
        id: 'mobile.components.select_server_view.connecting',
        defaultMessage: 'Connecting',
    },
    advancedOptions: {
        id: 'mobile.components.select_server_view.advancedOptions',
        defaultMessage: 'Advanced Options',
    },
    preauthSecret: {
        id: 'mobile.components.select_server_view.sharedSecret',
        defaultMessage: 'Authentication secret',
    },
    preauthSecretHelp: {
        id: 'mobile.components.select_server_view.sharedSecretHelp',
        defaultMessage: 'The authentication secret shared by the administrator',
    },
    preauthSecretInvalid: {
        id: 'mobile.server.preauth_secret.invalid',
        defaultMessage: 'Authentication secret is invalid. Try again or contact your admin.',
    },
});

const ADVANCED_OPTIONS_EXPANDED = 114;
const ADVANCED_OPTIONS_COLLAPSED = 40;

const ServerForm = ({
    autoFocus = false,
    buttonDisabled,
    connecting,
    displayName = '',
    displayNameError,
    disableServerUrl,
    handleConnect,
    handleDisplayNameTextChanged,
    handlePreauthSecretTextChanged,
    handleUrlTextChanged,
    keyboardAwareRef,
    preauthSecret = '',
    preauthSecretError,
    setShowAdvancedOptions,
    showAdvancedOptions,
    theme,
    url = '',
    urlError,
}: Props) => {
    const {formatMessage} = useIntl();
    const displayNameRef = useRef<FloatingTextInputRef>(null);
    const preauthSecretRef = useRef<FloatingTextInputRef>(null);
    const urlRef = useRef<FloatingTextInputRef>(null);
    const styles = getStyleSheet(theme);

    useAvoidKeyboard(keyboardAwareRef, 1.8);

    const onConnect = useCallback(() => {
        Keyboard.dismiss();
        handleConnect();
    }, [handleConnect]);

    const onUrlSubmit = useCallback(() => {
        displayNameRef.current?.focus();
    }, []);

    const onDisplayNameSubmit = useCallback(() => {
        if (showAdvancedOptions || preauthSecretError) {
            preauthSecretRef.current?.focus();
        } else {
            onConnect();
        }
    }, [showAdvancedOptions, preauthSecretError, onConnect]);

    const toggleAdvancedOptions = useCallback(() => {
        setShowAdvancedOptions((prev: boolean) => !prev);
    }, [setShowAdvancedOptions]);

    const chevronRotation = useSharedValue(showAdvancedOptions ? 180 : 0);
    const advancedOptionsStyle = useAnimatedStyle(() => ({
        height: showAdvancedOptions ? ADVANCED_OPTIONS_EXPANDED : withTiming(ADVANCED_OPTIONS_COLLAPSED, {duration: 250}),
    }));

    useEffect(() => {
        chevronRotation.value = withTiming(showAdvancedOptions ? 180 : 0, {duration: 250});

        // chevronRotation is a Reanimated shared value; its reference is stable and does not need to be in the dependency array.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showAdvancedOptions]);

    const chevronAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{rotate: `${chevronRotation.value}deg`}],
    }));

    const connectButtonTestId = buttonDisabled ? 'server_form.connect.button.disabled' : 'server_form.connect.button';

    return (
        <View style={styles.formContainer}>
            <View style={styles.fullWidth}>
                <FloatingTextInput
                    autoCorrect={false}
                    autoCapitalize={'none'}
                    autoFocus={autoFocus}
                    containerStyle={styles.enterServer}
                    enablesReturnKeyAutomatically={true}
                    editable={!disableServerUrl}
                    error={urlError}
                    keyboardType='url'
                    label={formatMessage({
                        id: 'mobile.components.select_server_view.enterServerUrl',
                        defaultMessage: 'Enter Server URL',
                    })}
                    onChangeText={handleUrlTextChanged}
                    onSubmitEditing={onUrlSubmit}
                    ref={urlRef}
                    returnKeyType='next'
                    spellCheck={false}
                    testID='server_form.server_url.input'
                    theme={theme}
                    value={url}
                />
            </View>
            <View style={styles.fullWidth}>
                <FloatingTextInput
                    autoCorrect={false}
                    autoCapitalize={'none'}
                    enablesReturnKeyAutomatically={true}
                    error={displayNameError}
                    label={formatMessage({
                        id: 'mobile.components.select_server_view.displayName',
                        defaultMessage: 'Display Name',
                    })}
                    onChangeText={handleDisplayNameTextChanged}
                    onSubmitEditing={onDisplayNameSubmit}
                    ref={displayNameRef}
                    returnKeyType={showAdvancedOptions || preauthSecretError ? 'next' : 'done'}
                    spellCheck={false}
                    testID='server_form.server_display_name.input'
                    theme={theme}
                    value={displayName}
                />
            </View>

            {!displayNameError &&
            <FormattedText
                defaultMessage={'Choose a display name for your server'}
                id={'mobile.components.select_server_view.displayHelp'}
                style={styles.chooseText}
                testID={'server_form.display_help'}
            />
            }

            <Animated.View style={[styles.advancedOptionsContainer, advancedOptionsStyle]}>
                <Pressable
                    onPress={toggleAdvancedOptions}
                    style={styles.advancedOptionsHeader}
                    testID='server_form.advanced_options.toggle'
                >
                    <Animated.View style={chevronAnimatedStyle}>
                        <CompassIcon
                            name='chevron-down'
                            size={20}
                            style={styles.advancedOptionsTitle}
                        />
                    </Animated.View>
                    <FormattedText
                        defaultMessage='Advanced Options'
                        id='mobile.components.select_server_view.advancedOptions'
                        style={styles.advancedOptionsTitle}
                    />
                </Pressable>

                {showAdvancedOptions && (
                    <Animated.View
                        style={styles.advancedOptionsContent}
                        entering={FlipInEasyX.duration(250)}
                        exiting={FlipOutXUp.duration(250)}
                    >
                        <FloatingTextInput
                            autoCorrect={false}
                            autoCapitalize={'none'}
                            enablesReturnKeyAutomatically={true}
                            error={preauthSecretError}
                            label={formatMessage(messages.preauthSecret)}
                            onChangeText={handlePreauthSecretTextChanged}
                            onSubmitEditing={onConnect}
                            ref={preauthSecretRef}
                            returnKeyType='done'
                            secureTextEntry={true}
                            spellCheck={false}
                            testID='server_form.preauth_secret.input'
                            theme={theme}
                            value={preauthSecret}
                        />
                        <FormattedText
                            {...messages.preauthSecretHelp}
                            style={styles.chooseText}
                            testID='server_form.preauth_secret_help'
                        />
                    </Animated.View>
                )}
            </Animated.View>

            <View style={styles.connectButtonContainer}>
                <Button
                    disabled={buttonDisabled}
                    onPress={onConnect}
                    testID={connectButtonTestId}
                    size='lg'
                    theme={theme}
                    text={formatMessage(connecting ? messages.connecting : messages.connect)}
                    showLoader={connecting}
                />
            </View>
        </View>
    );
};

export default ServerForm;

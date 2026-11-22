// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {errorCodes, isErrorWithCode, keepLocalCopy, pick} from '@react-native-documents/picker';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Keyboard, type LayoutChangeEvent, Pressable, Text, TouchableOpacity, View} from 'react-native';
import Animated, {FlipInEasyX, FlipOutXUp, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import Button from '@components/button';
import CompassIcon from '@components/compass_icon';
import FloatingTextInput, {type FloatingTextInputRef} from '@components/floating_input/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import {usePreventDoubleTap} from '@hooks/utils';
import {logError} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

export type ServerCaFile = {
    name: string;
    uri: string; // temporary local copy in the app's caches directory
};

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
    preauthSecret?: string;
    preauthSecretError?: string;
    serverCaFile?: ServerCaFile;
    serverCaError?: string;
    setServerCaFile: (file: ServerCaFile | undefined) => void;
    setServerCaError: (error: string | undefined) => void;
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
        paddingHorizontal: 24,
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
    endAdornment: {
        top: 2,
    },
    inputsContainer: {
        gap: 24,
        width: '100%',
    },
    serverCaContainer: {
        width: '100%',
        marginTop: 16,
        gap: 8,
        alignItems: 'flex-start',
    },
    serverCaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '100%',
    },
    serverCaName: {
        flex: 1,
        color: theme.centerChannelColor,
        ...typography('Body', 100, 'Regular'),
    },
    serverCaError: {
        color: theme.errorTextColor,
        ...typography('Body', 75, 'Regular'),
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
    selectServerCa: {
        id: 'mobile.components.select_server_view.selectServerCa',
        defaultMessage: 'Select CA certificate',
    },
    changeServerCa: {
        id: 'mobile.components.select_server_view.changeServerCa',
        defaultMessage: 'Change CA certificate',
    },
    serverCaFileError: {
        id: 'mobile.components.select_server_view.serverCaFileError',
        defaultMessage: 'Could not open the selected file',
    },
});

const hitSlop = {top: 8, right: 8, bottom: 8, left: 8};

// Height of the "Advanced Options" header; the expanded height adds the measured content height.
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
    preauthSecret = '',
    preauthSecretError,
    serverCaFile,
    serverCaError,
    setServerCaFile,
    setServerCaError,
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
    const [isPreauthSecretVisible] = useState(false);

    const onConnect = useCallback(() => {
        Keyboard.dismiss();
        handleConnect();
    }, [handleConnect]);

    const onSelectServerCa = usePreventDoubleTap(useCallback(async () => {
        Keyboard.dismiss();
        try {
            // System document picker (Storage Access Framework on Android): no storage permission needed.
            const [picked] = await pick({allowMultiSelection: false, type: ['*/*']});
            if (!picked) {
                return;
            }

            // Content URIs from the picker can become unreadable later, so keep a local copy.
            const name = picked.name ?? 'ca.pem';
            const [copy] = await keepLocalCopy({
                files: [{uri: picked.uri, fileName: name}],
                destination: 'cachesDirectory',
            });
            if (copy.status !== 'success') {
                throw new Error(copy.copyError);
            }

            setServerCaFile({name, uri: copy.localUri});
            setServerCaError(undefined);
        } catch (error) {
            if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
                return;
            }
            logError('error selecting server CA file', error);
            setServerCaError(formatMessage(messages.serverCaFileError));
        }
    }, [formatMessage, setServerCaError, setServerCaFile]));

    const onClearServerCa = useCallback(() => {
        setServerCaFile(undefined);
        setServerCaError(undefined);
    }, [setServerCaError, setServerCaFile]);

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
    const advancedOptionsContentHeight = useSharedValue(0);
    const advancedOptionsStyle = useAnimatedStyle(() => ({
        height: showAdvancedOptions ? ADVANCED_OPTIONS_COLLAPSED + advancedOptionsContentHeight.value : withTiming(ADVANCED_OPTIONS_COLLAPSED, {duration: 250}),
    }));

    // The content grows when a CA file is selected or an error is shown, so measure it
    // instead of using a fixed expanded height.
    const onAdvancedOptionsContentLayout = useCallback((e: LayoutChangeEvent) => {
        advancedOptionsContentHeight.value = e.nativeEvent.layout.height;

        // advancedOptionsContentHeight is a Reanimated shared value with a stable reference.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
            <View style={styles.inputsContainer}>
                <FloatingTextInput
                    rawInput={true}
                    autoFocus={autoFocus}
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
                    testID='server_form.server_url.input'
                    theme={theme}
                    value={url}
                />
                <FloatingTextInput
                    rawInput={true}
                    enablesReturnKeyAutomatically={true}
                    error={displayNameError}
                    label={formatMessage({
                        id: 'mobile.components.select_server_view.displayName',
                        defaultMessage: 'Display Name',
                    })}
                    onChangeText={handleDisplayNameTextChanged}
                    onSubmitEditing={onDisplayNameSubmit}
                    ref={displayNameRef}
                    returnKeyType={showAdvancedOptions ? 'next' : 'done'}
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
                        onLayout={onAdvancedOptionsContentLayout}
                        entering={FlipInEasyX.duration(250)}
                        exiting={FlipOutXUp.duration(250)}
                    >
                        <FloatingTextInput
                            rawInput={true}
                            enablesReturnKeyAutomatically={true}
                            error={preauthSecretError}
                            keyboardType={isPreauthSecretVisible ? 'visible-password' : 'default'}
                            label={formatMessage(messages.preauthSecret)}
                            onChangeText={handlePreauthSecretTextChanged}
                            onSubmitEditing={onConnect}
                            ref={preauthSecretRef}
                            returnKeyType='done'
                            secureTextEntry={!isPreauthSecretVisible}
                            testID='server_form.preauth_secret.input'
                            theme={theme}
                            value={preauthSecret}
                        />
                        <FormattedText
                            {...messages.preauthSecretHelp}
                            style={styles.chooseText}
                            testID='server_form.preauth_secret_help'
                        />
                        <View style={styles.serverCaContainer}>
                            <Button
                                emphasis='tertiary'
                                iconName='paperclip'
                                onPress={onSelectServerCa}
                                size='m'
                                testID='server_form.server_ca.button'
                                text={formatMessage(serverCaFile ? messages.changeServerCa : messages.selectServerCa)}
                                theme={theme}
                            />
                            {serverCaFile && (
                                <View style={styles.serverCaRow}>
                                    <CompassIcon
                                        name='file-generic-outline'
                                        size={20}
                                        color={changeOpacity(theme.centerChannelColor, 0.64)}
                                    />
                                    <Text
                                        style={styles.serverCaName}
                                        numberOfLines={1}
                                        ellipsizeMode='middle'
                                        testID='server_form.server_ca.name'
                                    >
                                        {serverCaFile.name}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={onClearServerCa}
                                        hitSlop={hitSlop}
                                        testID='server_form.server_ca.clear'
                                    >
                                        <CompassIcon
                                            name='close-circle'
                                            size={20}
                                            color={changeOpacity(theme.centerChannelColor, 0.64)}
                                        />
                                    </TouchableOpacity>
                                </View>
                            )}
                            {Boolean(serverCaError) && (
                                <Text
                                    style={styles.serverCaError}
                                    testID='server_form.server_ca.error'
                                >
                                    {serverCaError}
                                </Text>
                            )}
                        </View>
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

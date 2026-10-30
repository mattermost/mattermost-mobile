// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Keyboard, Pressable, Text, View} from 'react-native';
import Animated, {FlipInEasyX, FlipOutXUp, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import Button from '@components/button';
import CompassIcon from '@components/compass_icon';
import FloatingTextInput, {type FloatingTextInputRef} from '@components/floating_input/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {ServerCertificateInfo} from '@managers/server_certificate_manager';

type Props = {
    autoFocus?: boolean;
    buttonDisabled: boolean;
    certificate?: ServerCertificateInfo;
    certificateError?: string;
    connecting: boolean;
    displayName?: string;
    displayNameError?: string;
    disableServerUrl: boolean;
    handleConnect: () => void;
    handleDisplayNameTextChanged: (text: string) => void;
    handleImportCertificate: () => void;
    handlePreauthSecretTextChanged: (text: string) => void;
    handleRemoveCertificate: () => void;
    handleUrlTextChanged: (text: string) => void;
    importingCertificate: boolean;
    preauthSecret?: string;
    preauthSecretError?: string;
    setShowAdvancedOptions: React.Dispatch<React.SetStateAction<boolean>>;
    showAdvancedOptions: boolean;
    showCertificateImport: boolean;
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
    certificateActions: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
        width: '100%',
    },
    certificateButtonContainer: {
        flex: 1,
    },
    certificateContainer: {
        marginTop: 16,
        width: '100%',
    },
    certificateError: {
        color: theme.errorTextColor,
        marginTop: 8,
        ...typography('Body', 75, 'Regular'),
    },
    certificateHelp: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        marginTop: 4,
        ...typography('Body', 75, 'Regular'),
    },
    certificateRemove: {
        padding: 12,
    },
    certificateSelected: {
        color: theme.centerChannelColor,
        marginTop: 12,
        ...typography('Body', 75, 'SemiBold'),
    },
    certificateTitle: {
        color: theme.centerChannelColor,
        ...typography('Body', 100, 'SemiBold'),
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
    certificateTitle: {
        id: 'mobile.components.select_server_view.caCertificate',
        defaultMessage: 'Server CA certificate (optional)',
    },
    certificateHelp: {
        id: 'mobile.components.select_server_view.caCertificateHelp',
        defaultMessage: 'For a private certificate authority, import its public root .crt or PEM file. It is trusted only inside ENCMA; hostname verification stays enabled.',
    },
    importCertificate: {
        id: 'mobile.components.select_server_view.importCaCertificate',
        defaultMessage: 'Import CA certificate',
    },
    replaceCertificate: {
        id: 'mobile.components.select_server_view.replaceCaCertificate',
        defaultMessage: 'Replace CA certificate',
    },
    removeCertificate: {
        id: 'mobile.components.select_server_view.removeCaCertificate',
        defaultMessage: 'Remove CA certificate',
    },
    selectedCertificate: {
        id: 'mobile.components.select_server_view.selectedCaCertificate',
        defaultMessage: '{fileName} · {host}',
    },
});

const ADVANCED_OPTIONS_EXPANDED = 114;
const ADVANCED_OPTIONS_COLLAPSED = 40;

const ServerForm = ({
    autoFocus = false,
    buttonDisabled,
    certificate,
    certificateError,
    connecting,
    displayName = '',
    displayNameError,
    disableServerUrl,
    handleConnect,
    handleDisplayNameTextChanged,
    handleImportCertificate,
    handlePreauthSecretTextChanged,
    handleRemoveCertificate,
    handleUrlTextChanged,
    importingCertificate,
    preauthSecret = '',
    preauthSecretError,
    setShowAdvancedOptions,
    showAdvancedOptions,
    showCertificateImport,
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

            {showCertificateImport && (
                <View
                    style={styles.certificateContainer}
                    testID='server_form.certificate.container'
                >
                    <FormattedText
                        {...messages.certificateTitle}
                        style={styles.certificateTitle}
                    />
                    <FormattedText
                        {...messages.certificateHelp}
                        style={styles.certificateHelp}
                        testID='server_form.certificate.help'
                    />
                    <View style={styles.certificateActions}>
                        <Button
                            buttonContainerStyle={styles.certificateButtonContainer}
                            disabled={importingCertificate || connecting}
                            emphasis='secondary'
                            iconName='upload-outline'
                            onPress={handleImportCertificate}
                            showLoader={importingCertificate}
                            testID='server_form.certificate.import'
                            text={formatMessage(certificate ? messages.replaceCertificate : messages.importCertificate)}
                            theme={theme}
                        />
                        {certificate && (
                            <Pressable
                                accessibilityLabel={formatMessage(messages.removeCertificate)}
                                accessibilityRole='button'
                                disabled={importingCertificate || connecting}
                                onPress={handleRemoveCertificate}
                                style={styles.certificateRemove}
                                testID='server_form.certificate.remove'
                            >
                                <CompassIcon
                                    color={theme.errorTextColor}
                                    name='trash-can-outline'
                                    size={22}
                                />
                            </Pressable>
                        )}
                    </View>
                    {certificate && (
                        <FormattedText
                            {...messages.selectedCertificate}
                            numberOfLines={2}
                            style={styles.certificateSelected}
                            testID='server_form.certificate.selected'
                            values={{fileName: certificate.fileName, host: certificate.host}}
                        />
                    )}
                    {certificateError && (
                        <Text
                            style={styles.certificateError}
                            testID='server_form.certificate.error'
                        >
                            {certificateError}
                        </Text>
                    )}
                </View>
            )}

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

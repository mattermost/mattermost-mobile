// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type MutableRefObject, useCallback, useEffect, useRef} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Platform, useWindowDimensions, View} from 'react-native';
import Button from 'react-native-button';

import FloatingTextInput, {type FloatingTextInputRef} from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {useIsTablet} from '@hooks/device';
import {t} from '@i18n';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
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
    handleUrlTextChanged: (text: string) => void;
    isModal?: boolean;
    keyboardAwareRef: MutableRefObject<KeyboardAwareScrollView | null>;
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
    connectButton: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        width: '100%',
        marginTop: 32,
        marginLeft: 20,
        marginRight: 20,
        padding: 15,
    },
    connectingIndicator: {
        marginRight: 10,
    },
    loadingContainerStyle: {
        marginRight: 10,
        padding: 0,
        top: -2,
    },
}));

const ServerForm = ({
    autoFocus = false,
    buttonDisabled,
    connecting,
    displayName = '',
    displayNameError,
    disableServerUrl,
    handleConnect,
    handleDisplayNameTextChanged,
    handleUrlTextChanged,
    isModal,
    keyboardAwareRef,
    theme,
    url = '',
    urlError,
}: Props) => {
    const {formatMessage} = useIntl();
    const isTablet = useIsTablet();
    const dimensions = useWindowDimensions();
    const displayNameRef = useRef<FloatingTextInputRef>(null);
    const urlRef = useRef<FloatingTextInputRef>(null);
    const styles = getStyleSheet(theme);

    const focus = () => {
        if (Platform.OS === 'ios') {
            let offsetY = isModal ? 120 : 160;
            if (isTablet) {
                const {width, height} = dimensions;
                const isLandscape = width > height;
                offsetY = isLandscape ? 230 : 100;
            }
            requestAnimationFrame(() => {
                keyboardAwareRef.current?.scrollToPosition(0, offsetY);
            });
        }
    };

    const onBlur = useCallback(() => {
        if (Platform.OS === 'ios') {
            const reset = !displayNameRef.current?.isFocused() && !urlRef.current?.isFocused();
            if (reset) {
                keyboardAwareRef.current?.scrollToPosition(0, 0);
            }
        }
    }, []);

    const onConnect = useCallback(() => {
        Keyboard.dismiss();
        handleConnect();
    }, [buttonDisabled, connecting, displayName, theme, url]);

    const onFocus = useCallback(() => {
        focus();
    }, [dimensions]);

    const onUrlSubmit = useCallback(() => {
        displayNameRef.current?.focus();
    }, []);

    useEffect(() => {
        if (Platform.OS === 'ios' && isTablet) {
            if (urlRef.current?.isFocused() || displayNameRef.current?.isFocused()) {
                focus();
            } else {
                keyboardAwareRef.current?.scrollToPosition(0, 0);
            }
        }
    }, [dimensions, isTablet]);

    const buttonType = buttonDisabled ? 'disabled' : 'default';
    const styleButtonText = buttonTextStyle(theme, 'lg', 'primary', buttonType);
    const styleButtonBackground = buttonBackgroundStyle(theme, 'lg', 'primary', buttonType);

    let buttonID = t('mobile.components.select_server_view.connect');
    let buttonText = 'Connect';
    let buttonIcon;

    if (connecting) {
        buttonID = t('mobile.components.select_server_view.connecting');
        buttonText = 'Connecting';
        buttonIcon = (
            <Loading
                containerStyle={styles.loadingContainerStyle}
                color={theme.buttonColor}
            />
        );
    }

    const connectButtonTestId = buttonDisabled ? 'server_form.connect.button.disabled' : 'server_form.connect.button';

    return (
        <View style={styles.formContainer}>
            <View style={styles.fullWidth}>
                <FloatingTextInput
                    autoCorrect={false}
                    autoCapitalize={'none'}
                    autoFocus={autoFocus}
                    blurOnSubmit={false}
                    containerStyle={styles.enterServer}
                    enablesReturnKeyAutomatically={true}
                    editable={!disableServerUrl}
                    error={urlError}
                    keyboardType='url'
                    label={formatMessage({
                        id: 'mobile.components.select_server_view.enterServerUrl',
                        defaultMessage: 'Enter Server URL',
                    })}
                    onBlur={onBlur}
                    onChangeText={handleUrlTextChanged}
                    onFocus={onFocus}
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
                    onBlur={onBlur}
                    onChangeText={handleDisplayNameTextChanged}
                    onFocus={onFocus}
                    onSubmitEditing={onConnect}
                    ref={displayNameRef}
                    returnKeyType='done'
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
            <Button
                containerStyle={[styles.connectButton, styleButtonBackground]}
                disabled={buttonDisabled}
                onPress={onConnect}
                testID={connectButtonTestId}
            >
                {buttonIcon}
                <FormattedText
                    defaultMessage={buttonText}
                    id={buttonID}
                    style={styleButtonText}
                />
            </Button>
        </View>
    );
};

export default ServerForm;

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {MutableRefObject, useCallback, useEffect, useRef} from 'react';
import {useIntl} from 'react-intl';
import {Platform, useWindowDimensions, View} from 'react-native';
import Button from 'react-native-button';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

import FloatingTextInput, {FloatingTextInputRef} from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {useIsTablet} from '@hooks/device';
import {t} from '@i18n';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    buttonDisabled: boolean;
    connecting: boolean;
    displayName?: string;
    displayNameError?: string;
    handleConnect: () => void;
    handleDisplayNameTextChanged: (text: string) => void;
    handleUrlTextChanged: (text: string) => void;
    keyboardAwareRef: MutableRefObject<KeyboardAwareScrollView | undefined>;
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
    error: {
        marginBottom: 18,
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
}));

const ServerForm = ({
    buttonDisabled,
    connecting,
    displayName = '',
    displayNameError,
    handleConnect,
    handleDisplayNameTextChanged,
    handleUrlTextChanged,
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
    };

    const onBlur = useCallback(() => {
        if (Platform.OS === 'ios' && isTablet && !urlRef.current?.isFocused() && !displayNameRef.current?.isFocused()) {
            keyboardAwareRef.current?.scrollToPosition(0, 0);
        }
    }, []);

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
            <Loading/>
        );
    }

    return (
        <View style={styles.formContainer}>
            <View style={[styles.fullWidth, urlError?.length ? styles.error : undefined]}>
                <FloatingTextInput
                    autoCorrect={false}
                    autoCapitalize={'none'}
                    blurOnSubmit={false}
                    containerStyle={styles.enterServer}
                    enablesReturnKeyAutomatically={true}
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
                    testID='select_server.server_url.input'
                    theme={theme}
                    value={url}
                />
            </View>
            <View style={[styles.fullWidth, displayNameError?.length ? styles.error : undefined]}>
                <FloatingTextInput
                    autoCorrect={false}
                    autoCapitalize={'none'}
                    enablesReturnKeyAutomatically={true}
                    error={displayNameError}
                    keyboardType='url'
                    label={formatMessage({
                        id: 'mobile.components.select_server_view.displayName',
                        defaultMessage: 'Display Name',
                    })}
                    onBlur={onBlur}
                    onChangeText={handleDisplayNameTextChanged}
                    onFocus={onFocus}
                    onSubmitEditing={handleConnect}
                    ref={displayNameRef}
                    returnKeyType='done'
                    testID='select_server.server_display_name.input'
                    theme={theme}
                    value={displayName}
                />
            </View>
            {!displayNameError &&
            <FormattedText
                defaultMessage={'Choose a display name for your server'}
                id={'mobile.components.select_server_view.displayHelp'}
                style={styles.chooseText}
                testID={'mobile.components.select_server_view.displayHelp'}
            />
            }
            <Button
                containerStyle={[styles.connectButton, styleButtonBackground]}
                disabled={buttonDisabled}
                onPress={handleConnect}
                testID='select_server.connect.button'
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

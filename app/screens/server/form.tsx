// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Button} from '@rneui/base';
import React, {type RefObject, useCallback, useRef} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, View} from 'react-native';

import FloatingTextInput, {type FloatingTextInputRef} from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {useAvoidKeyboard} from '@hooks/device';
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
    keyboardAwareRef: RefObject<KeyboardAwareScrollView>;
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
        width: '100%',
        marginTop: 32,
        marginLeft: 20,
        marginRight: 20,
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
    keyboardAwareRef,
    theme,
    url = '',
    urlError,
}: Props) => {
    const {formatMessage} = useIntl();
    const displayNameRef = useRef<FloatingTextInputRef>(null);
    const urlRef = useRef<FloatingTextInputRef>(null);
    const styles = getStyleSheet(theme);

    useAvoidKeyboard(keyboardAwareRef);

    const onConnect = useCallback(() => {
        Keyboard.dismiss();
        handleConnect();
    }, [handleConnect]);

    const onUrlSubmit = useCallback(() => {
        displayNameRef.current?.focus();
    }, []);

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
                containerStyle={styles.connectButton}
                disabled={buttonDisabled}
                onPress={onConnect}
                testID={connectButtonTestId}
                buttonStyle={styleButtonBackground}
                disabledStyle={styleButtonBackground}
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

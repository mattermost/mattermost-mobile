// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type RefObject, useCallback, useRef} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Keyboard, View} from 'react-native';

import Button from '@components/button';
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
});

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

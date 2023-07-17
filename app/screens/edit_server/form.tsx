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
import {removeProtocol, stripTrailingSlashes} from '@utils/url';

import type {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

type Props = {
    buttonDisabled: boolean;
    connecting: boolean;
    displayName?: string;
    displayNameError?: string;
    handleUpdate: () => void;
    handleDisplayNameTextChanged: (text: string) => void;
    keyboardAwareRef: MutableRefObject<KeyboardAwareScrollView | null>;
    serverUrl: string;
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
    connectButton: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        width: '100%',
        marginTop: 32,
        marginLeft: 20,
        marginRight: 20,
        padding: 15,
    },
    loadingContainerStyle: {
        marginRight: 10,
        padding: 0,
        top: -2,
    },
    loading: {
        height: 20,
        width: 20,
    },
}));

const EditServerForm = ({
    buttonDisabled,
    connecting,
    displayName = '',
    displayNameError,
    handleUpdate,
    handleDisplayNameTextChanged,
    keyboardAwareRef,
    serverUrl,
    theme,
}: Props) => {
    const {formatMessage} = useIntl();
    const isTablet = useIsTablet();
    const dimensions = useWindowDimensions();
    const displayNameRef = useRef<FloatingTextInputRef>(null);
    const styles = getStyleSheet(theme);

    const onBlur = useCallback(() => {
        if (Platform.OS === 'ios') {
            const reset = !displayNameRef.current?.isFocused();
            if (reset) {
                keyboardAwareRef.current?.scrollToPosition(0, 0);
            }
        }
    }, []);

    const onUpdate = useCallback(() => {
        Keyboard.dismiss();
        handleUpdate();
    }, [handleUpdate]);

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
    }, [dimensions, isTablet]);

    useEffect(() => {
        if (Platform.OS === 'ios' && isTablet) {
            if (displayNameRef.current?.isFocused()) {
                onFocus();
            } else {
                keyboardAwareRef.current?.scrollToPosition(0, 0);
            }
        }
    }, [onFocus]);

    const buttonType = buttonDisabled ? 'disabled' : 'default';
    const styleButtonText = buttonTextStyle(theme, 'lg', 'primary', buttonType);
    const styleButtonBackground = buttonBackgroundStyle(theme, 'lg', 'primary', buttonType);

    let buttonID = t('edit_server.save');
    let buttonText = 'Save';
    let buttonIcon;

    if (connecting) {
        buttonID = t('edit_server.saving');
        buttonText = 'Saving';
        buttonIcon = (
            <Loading
                containerStyle={styles.loadingContainerStyle}
                color={theme.buttonColor}
            />
        );
    }

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
                    onSubmitEditing={onUpdate}
                    ref={displayNameRef}
                    returnKeyType='done'
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
            <Button
                containerStyle={[styles.connectButton, styleButtonBackground]}
                disabled={buttonDisabled}
                onPress={onUpdate}
                testID={saveButtonTestId}
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

export default EditServerForm;

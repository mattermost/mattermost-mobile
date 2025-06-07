// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useHardwareKeyboardEvents} from '@mattermost/hardware-keyboard';
import {forwardRef, useCallback, useImperativeHandle, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {StyleSheet, TextInput, View, type Insets, type NativeSyntheticEvent, type TextInputSubmitEditingEventData} from 'react-native';

import Button from '@components/button';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    setPassword: (text: string | undefined) => void;
    maxAttempts?: number;
    remainingAttempts?: number;
}

export type PasswordRef = {
    clear: () => void;
}

const hitSlop: Insets = {top: 10, bottom: 10, left: 10, right: 10};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
        backgroundColor: theme.centerChannelBg,
    },
    required: {
        ...typography('Body', 100, 'Regular'),
        color: theme.centerChannelColor,
        marginVertical: 10,
    },
    unlock: {
        ...typography('Body', 50, 'Regular'),
        color: theme.centerChannelColor,
    },
    limit: {
        ...typography('Body', 100, 'Regular'),
        color: theme.errorTextColor,
    },
    input: {
        ...typography('Body', 100, 'Regular'),
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
        color: theme.centerChannelColor,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.2),
        paddingHorizontal: 10,
        marginTop: 10,
        textAlign: 'center',
        textAlignVertical: 'center',
        height: 40,
        width: '80%',
        maxWidth: 400,
        marginBottom: 10,
    },
}));

const messages = defineMessages({
    password: {
        id: 'mobile.pdf_viewer.password',
        defaultMessage: 'Password',
    },
    enter_password: {
        id: 'mobile.pdf_viewer.enter_password',
        defaultMessage: 'Please enter the password to unlock it.',
    },
    password_failed: {
        id: 'mobile.pdf_viewer.password_failed',
        defaultMessage: 'Incorrect password. You have {count} {count, plural, one {attempt} other {attempts}} remaining.',
    },
    password_limit_reached: {
        id: 'mobile.pdf_viewer.password_limit_reached',
        defaultMessage: 'You’ve entered the wrong password too many times.',
    },
    unlock: {
        id: 'mobile.pdf_viewer.unlock',
        defaultMessage: 'Unlock',
    },
});

const PdfPassword = forwardRef<PasswordRef, Props>(({maxAttempts, remainingAttempts, setPassword}, ref) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [inputValue, setInputValue] = useState<string | undefined>(undefined);
    const limitReached = (maxAttempts !== undefined && maxAttempts > 0 && remainingAttempts === 0);
    const hasFailed = maxAttempts !== undefined && maxAttempts > 0 && remainingAttempts !== undefined && remainingAttempts < maxAttempts;
    const disabled = inputValue === undefined || inputValue.length === 0 || limitReached;

    let subtextComponent;
    if (limitReached) {
        subtextComponent = (
            <FormattedText
                id={messages.password_limit_reached.id}
                defaultMessage={messages.password_limit_reached.defaultMessage}
                accessibilityLiveRegion='polite'
                accessible={true}
                style={styles.limit}
            />
        );
    } else if (hasFailed) {
        subtextComponent = (
            <FormattedText
                id={messages.password_failed.id}
                defaultMessage={messages.password_failed.defaultMessage}
                values={{count: remainingAttempts}}
                accessibilityLiveRegion='polite'
                accessible={true}
                style={styles.unlock}
            />
        );
    } else {
        subtextComponent = (
            <FormattedText
                id={messages.enter_password.id}
                defaultMessage={messages.enter_password.defaultMessage}
                accessibilityLiveRegion='polite'
                accessible={true}
                style={styles.unlock}
            />
        );
    }

    useImperativeHandle(ref, () => ({
        clear: () => {
            setInputValue(undefined);
        },
    }), []);

    const onSubmitEditing = useCallback((e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
        const value = e.nativeEvent.text.trim();
        if (value) {
            setPassword(value);
        }
    }, [setPassword]);

    const onPress = useCallback(() => {
        setPassword(inputValue?.trim());
    }, [inputValue, setPassword]);

    useHardwareKeyboardEvents({onEnterPressed: onPress});

    return (
        <View style={styles.container}>
            <CompassIcon
                name='lock-outline'
                size={52}
                color={theme.centerChannelColor}
            />
            <FormattedText
                id='mobile.pdf_viewer.password_required'
                defaultMessage='This document is password protected.'
                style={styles.required}
            />
            {subtextComponent}
            <TextInput
                accessible={true}
                accessibilityLabel={intl.formatMessage(messages.password)}
                accessibilityHint={intl.formatMessage(messages.enter_password)}
                accessibilityRole='text'
                autoFocus={true}
                editable={!limitReached}
                enablesReturnKeyAutomatically={true}
                enterKeyHint='done'
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                numberOfLines={1}
                onChangeText={setInputValue}
                onSubmitEditing={onSubmitEditing}
                placeholder={intl.formatMessage(messages.password)}
                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                returnKeyType='done'
                secureTextEntry={true}
                style={styles.input}
                submitBehavior='submit'
                testID='pdf_password_input'
                textContentType='password'
                value={inputValue}
            />
            <Button
                accessible={true}
                accessibilityLabel={intl.formatMessage(messages.unlock)}
                accessibilityHint={intl.formatMessage(messages.enter_password)}
                accessibilityRole='button'
                disabled={disabled}
                emphasis={'primary'}
                hitSlop={hitSlop}
                iconName='key-variant'
                onPress={onPress}
                size='m'
                testID='pdf_password_unlock'
                text={intl.formatMessage(messages.unlock)}
                theme={theme}
            />
        </View>
    );
});

PdfPassword.displayName = 'PdfPassword';

export default PdfPassword;

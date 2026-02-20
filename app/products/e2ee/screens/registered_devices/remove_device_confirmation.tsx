// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Modal, TextInput, View} from 'react-native';

import Button from '@components/button';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const CONFIRM_WORD = 'remove';

type Props = {
    visible: boolean;
    onDismiss: () => void;
    onRemove: () => Promise<void>;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    backdrop: {
        flex: 1,
        backgroundColor: changeOpacity('#000000', 0.50),
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    card: {
        backgroundColor: changeOpacity(theme.centerChannelBg, 0.9),
        borderRadius: 24,
        padding: 14,
        width: '100%',
        maxWidth: 300,
        gap: 10,
    },
    title: {
        ...typography('Body', 200, 'SemiBold'),
        color: theme.centerChannelColor,
        paddingHorizontal: 8,
    },
    description: {
        ...typography('Body', 200),
        color: theme.centerChannelColor,
        paddingHorizontal: 8,
        paddingBottom: 16,
        gap: 10,
    },
    input: {
        ...typography('Body', 200),
        color: theme.centerChannelColor,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 10,
    },
    buttonsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 16,
    },
    buttonFlex: {
        flex: 1,
    },
    dialogButton: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderRadius: 24,
    },
    cancelText: {
        color: theme.centerChannelColor,
    },
}));

export const RemoveDeviceConfirmation = ({visible, onDismiss, onRemove}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [confirmText, setConfirmText] = useState('');
    const [isRemoving, setIsRemoving] = useState(false);

    useEffect(() => {
        if (!visible) {
            setConfirmText('');
            setIsRemoving(false);
        }
    }, [visible]);

    const handleRemove = useCallback(async () => {
        setIsRemoving(true);
        await onRemove();
        onDismiss();
    }, [onDismiss, onRemove]);

    const canRemove = confirmText === CONFIRM_WORD && !isRemoving;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType='fade'
            onRequestClose={onDismiss}
            testID='e2ee.remove_device_confirmation.modal'
        >
            <View style={styles.backdrop}>
                <View
                    style={styles.card}
                    testID='e2ee.remove_device_confirmation.card'
                >
                    <FormattedText
                        id='e2ee.remove_device.title'
                        defaultMessage='Remove device'
                        style={styles.title}
                        testID='e2ee.remove_device_confirmation.title'
                    />
                    <FormattedText
                        id='e2ee.remove_device.description'
                        defaultMessage='This will permanently delete all account information, including any end-to-end encrypted messages stored on this device.{newline}{newline}This action cannot be undone.{newline}{newline}Type "remove" in the field below to confirm and remove device.'
                        values={{newline: '\n'}}
                        style={styles.description}
                        testID='e2ee.remove_device_confirmation.description'
                    />
                    <TextInput
                        value={confirmText}
                        onChangeText={setConfirmText}
                        placeholder={intl.formatMessage({id: 'e2ee.remove_device.input_placeholder', defaultMessage: 'Type here...'})}
                        placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                        style={styles.input}
                        autoCapitalize='none'
                        autoCorrect={false}
                        editable={!isRemoving}
                        testID='e2ee.remove_device_confirmation.input'
                    />
                    <View style={styles.buttonsRow}>
                        <View style={styles.buttonFlex}>
                            <Button
                                theme={theme}
                                text={intl.formatMessage({id: 'e2ee.remove_device.cancel', defaultMessage: 'Cancel'})}
                                onPress={onDismiss}
                                emphasis='tertiary'
                                size='m'
                                backgroundStyle={styles.dialogButton}
                                textStyle={styles.cancelText}
                                testID='e2ee.remove_device_confirmation.cancel'
                            />
                        </View>
                        <View style={styles.buttonFlex}>
                            <Button
                                theme={theme}
                                text={intl.formatMessage({id: 'e2ee.remove_device.remove', defaultMessage: 'Remove'})}
                                onPress={handleRemove}
                                isDestructive={true}
                                emphasis='tertiary'
                                size='m'
                                backgroundStyle={styles.dialogButton}
                                disabled={!canRemove}
                                testID='e2ee.remove_device_confirmation.remove'
                            />
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

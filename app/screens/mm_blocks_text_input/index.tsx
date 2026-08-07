// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Keyboard, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import NavigationButton from '@components/navigation_button';
import Footer from '@components/settings/footer';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateBack} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {selectKeyboardType} from '@utils/integrations';

const MULTILINE_INPUT_HEIGHT = 154;

const messages = defineMessages({
    save: {
        id: 'mm_blocks.text_input.save',
        defaultMessage: 'Save',
    },
    optional: {
        id: 'channel_modal.optional',
        defaultMessage: '(optional)',
    },
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    inputContainer: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
});

export type MmBlocksTextInputProps = {
    label?: string;
    initialValue?: string;
    placeholder?: string;
    multiline?: boolean;
    maxLength?: number;
    subtype?: MmTextInputSubtype;
    optional?: boolean;
    helpText?: string;
};

const close = () => {
    Keyboard.dismiss();
    navigateBack();
};

const MmBlocksTextInput = ({
    label,
    initialValue,
    placeholder,
    multiline,
    maxLength,
    subtype,
    optional,
    helpText,
}: MmBlocksTextInputProps) => {
    const intl = useIntl();
    const navigation = useNavigation();
    const theme = useTheme();
    const [value, setValue] = useState(initialValue ?? '');

    const handleSave = useCallback(() => {
        CallbackStore.getCallback<(next: string) => void>()?.(value);
        close();
    }, [value]);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <NavigationButton
                    onPress={handleSave}
                    testID='mm_blocks.text_input.save.button'
                    text={intl.formatMessage(messages.save)}
                />
            ),
        });
    }, [handleSave, intl, navigation]);

    useEffect(() => {
        return () => {
            CallbackStore.removeCallback();
        };
    }, []);

    useAndroidHardwareBackHandler(Screens.MM_BLOCKS_TEXT_INPUT, close);

    const trimmedLabel = label?.trim();
    const suffix = optional ? ` ${intl.formatMessage(messages.optional)}` : ' *';

    return (
        <SafeAreaView
            edges={['bottom']}
            style={styles.container}
            testID='mm_blocks_text_input.screen'
        >
            <View style={styles.inputContainer}>
                <FloatingTextInput
                    autoFocus={true}
                    keyboardType={selectKeyboardType(subtype)}
                    label={trimmedLabel ? `${trimmedLabel}${suffix}` : ''}
                    maxLength={maxLength}
                    multiline={multiline}
                    multilineInputHeight={multiline ? MULTILINE_INPUT_HEIGHT : undefined}
                    onChangeText={setValue}
                    placeholder={placeholder}
                    secureTextEntry={subtype === 'password'}
                    testID='mm_blocks_text_input.input'
                    theme={theme}
                    value={value}
                />
            </View>
            <Footer
                disabled={false}
                helpText={helpText}
                location={Screens.MM_BLOCKS_TEXT_INPUT}
            />
        </SafeAreaView>
    );
};

export default MmBlocksTextInput;

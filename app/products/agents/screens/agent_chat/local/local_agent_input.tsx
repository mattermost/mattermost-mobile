// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {Pressable, TextInput, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    disabled?: boolean;
    isGenerating?: boolean;
    onSend: (message: string) => void;
    onStop?: () => void;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: changeOpacity(theme.centerChannelColor, 0.12),
        backgroundColor: theme.centerChannelBg,
        gap: 8,
    },
    input: {
        flex: 1,
        maxHeight: 120,
        minHeight: 40,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
        color: theme.centerChannelColor,
        ...typography('Body', 200),
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.buttonBg,
    },
    actionButtonDisabled: {
        backgroundColor: changeOpacity(theme.buttonBg, 0.32),
    },
    stopButton: {
        backgroundColor: theme.errorTextColor,
    },
}));

const LocalAgentInput = ({disabled = false, isGenerating = false, onSend, onStop}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [value, setValue] = useState('');

    const canSend = Boolean(value.trim()) && !disabled && !isGenerating;

    const handleSend = useCallback(() => {
        const trimmed = value.trim();
        if (!trimmed || disabled || isGenerating) {
            return;
        }
        setValue('');
        onSend(trimmed);
    }, [value, disabled, isGenerating, onSend]);

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={setValue}
                editable={!disabled && !isGenerating}
                multiline={true}
                placeholder={intl.formatMessage({
                    id: 'agents.local.input.placeholder',
                    defaultMessage: 'Ask Gemma…',
                })}
                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.48)}
                testID='agent_chat.local_input'
            />
            {isGenerating ? (
                <Pressable
                    onPress={onStop}
                    style={({pressed}) => [styles.actionButton, styles.stopButton, pressed && {opacity: 0.72}]}
                    testID='agent_chat.local_input.stop'
                >
                    <CompassIcon
                        name='close'
                        size={18}
                        color={theme.buttonColor}
                    />
                </Pressable>
            ) : (
                <Pressable
                    onPress={handleSend}
                    disabled={!canSend}
                    style={({pressed}) => [
                        styles.actionButton,
                        !canSend && styles.actionButtonDisabled,
                        pressed && canSend && {opacity: 0.72},
                    ]}
                    testID='agent_chat.local_input.send'
                >
                    <CompassIcon
                        name='send'
                        size={18}
                        color={theme.buttonColor}
                    />
                </Pressable>
            )}
        </View>
    );
};

export default LocalAgentInput;

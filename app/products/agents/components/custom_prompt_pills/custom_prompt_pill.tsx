// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Pressable, type PressableStateCallbackType, type StyleProp, Text, type ViewStyle} from 'react-native';

import Loading from '@components/loading';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {CustomPrompt} from '@agents/types/api';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: changeOpacity(theme.buttonBg, 0.08),
    },
    pillPressed: {
        backgroundColor: changeOpacity(theme.buttonBg, 0.16),
    },
    pillDisabled: {
        opacity: 0.6,
    },
    pillText: {
        color: theme.linkColor,
        ...typography('Body', 75, 'SemiBold'),
    },
}));

type Props = {
    prompt: CustomPrompt;
    executing: boolean;
    disabled: boolean;
    onPress: (prompt: CustomPrompt) => void;
};

const CustomPromptPill = ({prompt, executing, disabled, onPress}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const handlePress = usePreventDoubleTap(useCallback(() => {
        onPress(prompt);
    }, [onPress, prompt]));

    const pressableStyle = useCallback(({pressed}: PressableStateCallbackType): StyleProp<ViewStyle> => [
        styles.pill,
        pressed && styles.pillPressed,
        disabled && !executing && styles.pillDisabled,
    ], [styles, disabled, executing]);

    return (
        <Pressable
            onPress={handlePress}
            disabled={disabled}
            style={pressableStyle}
            testID={`agents.custom_prompts.pill.${prompt.id}`}
        >
            {executing && (
                <Loading
                    size='small'
                    color={theme.linkColor}
                />
            )}
            <Text
                style={styles.pillText}
                numberOfLines={1}
            >
                {prompt.name}
            </Text>
        </Pressable>
    );
};

export default CustomPromptPill;

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Pressable, type PressableStateCallbackType, type StyleProp, Text, type ViewStyle} from 'react-native';

import Loading from '@components/loading';
import {ITEM_HEIGHT} from '@components/option_item';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {CustomPrompt} from '@agents/types/api';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        minHeight: ITEM_HEIGHT,
        paddingVertical: 12,
    },
    rowPressed: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
    },
    rowDisabled: {
        opacity: 0.6,
    },
    name: {
        flexShrink: 1,
        color: theme.centerChannelColor,
        ...typography('Body', 200),
    },
}));

type Props = {
    prompt: CustomPrompt;
    rendering: boolean;
    disabled: boolean;
    onSelect: (prompt: CustomPrompt) => void;
};

const PromptItem = ({prompt, rendering, disabled, onSelect}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const handlePress = usePreventDoubleTap(useCallback(() => {
        onSelect(prompt);
    }, [onSelect, prompt]));

    const pressableStyle = useCallback(({pressed}: PressableStateCallbackType): StyleProp<ViewStyle> => [
        styles.row,
        pressed && styles.rowPressed,
        disabled && !rendering && styles.rowDisabled,
    ], [styles, disabled, rendering]);

    return (
        <Pressable
            onPress={handlePress}
            disabled={disabled}
            style={pressableStyle}
            testID={`agents.custom_prompts.item.${prompt.id}`}
        >
            <Text
                style={styles.name}
                numberOfLines={1}
            >
                {prompt.name}
            </Text>
            {rendering && (
                <Loading
                    size='small'
                    color={theme.buttonBg}
                />
            )}
        </Pressable>
    );
};

export default PromptItem;

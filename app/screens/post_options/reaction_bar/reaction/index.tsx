// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {Pressable, type PressableStateCallbackType, View} from 'react-native';

import Emoji from '@components/emoji';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        emoji: {
            color: '#000',
            fontWeight: 'bold',
        },
        highlight: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
            borderRadius: 4,
        },
        reactionContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
            borderRadius: 4,
            alignItems: 'center',
            justifyContent: 'center',
        },
    };
});

type ReactionProps = {
    onPressReaction: (emoji: string) => void;
    emoji: string;
    iconSize: number;
    containerSize: number;
    testID?: string;
}
const Reaction = ({onPressReaction, emoji, iconSize, containerSize, testID}: ReactionProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const handleReactionPressed = useCallback(() => {
        onPressReaction(emoji);
    }, [onPressReaction, emoji]);

    const highlightedStyle = useCallback(({pressed}: PressableStateCallbackType) => pressed && styles.highlight, [styles.highlight]);
    const reactionStyle = useMemo(() => [
        styles.reactionContainer,
        {
            width: containerSize,
            height: containerSize,
        },
    ], [containerSize]);

    return (
        <Pressable
            key={emoji}
            onPress={handleReactionPressed}
            style={highlightedStyle}
            testID={`${testID}.${emoji}`}
        >
            <View
                style={reactionStyle}
            >
                <Emoji
                    emojiName={emoji}
                    textStyle={styles.emoji}
                    size={iconSize}
                />
            </View>
        </Pressable>
    );
};

export default Reaction;

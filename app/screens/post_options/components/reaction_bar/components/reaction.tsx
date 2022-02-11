// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Pressable, PressableStateCallbackType, View} from 'react-native';

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
            backgroundColor: changeOpacity(theme.linkColor, 0.1),
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
}
const Reaction = ({onPressReaction, emoji, iconSize, containerSize}: ReactionProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const handleReactionPressed = useCallback(() => {
        onPressReaction(emoji);
    }, [onPressReaction]);

    const highlightedStyle = useCallback(({pressed}: PressableStateCallbackType) => pressed && styles.highlight, [styles.highlight]);

    return (
        <Pressable
            key={emoji}
            onPress={handleReactionPressed}
            style={highlightedStyle}
        >
            <View
                style={[
                    styles.reactionContainer,
                    {
                        width: containerSize,
                        height: containerSize,
                    },
                ]}
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

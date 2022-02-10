// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {View, TouchableWithoutFeedback} from 'react-native';

import Emoji from '@components/emoji';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import {useSelectedReaction} from './reaction_context';

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
    const selectedEmoji = useSelectedReaction();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const handleReactionPressed = useCallback(() => {
        onPressReaction(emoji);
    }, [onPressReaction]);

    return (
        <TouchableWithoutFeedback
            key={emoji}
            onPress={handleReactionPressed}
        >
            <View
                style={[
                    styles.reactionContainer,
                    selectedEmoji === emoji ? styles.highlight : null,
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
        </TouchableWithoutFeedback>
    );
};

export default Reaction;

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {TouchableOpacity, View} from 'react-native';
import AnimatedNumbers from 'react-native-animated-numbers';

import Emoji from '@components/emoji';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type ReactionProps = {
    count: number;
    emojiName: string;
    highlight: boolean;
    onPress: (emojiName: string, highlight: boolean) => void;
    onLongPress: () => void;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        count: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            ...typography('Body', 100, 'SemiBold'),
        },
        countContainer: {marginRight: 5},
        countHighlight: {
            color: theme.buttonBg,
        },
        customEmojiStyle: {color: '#000'},
        emoji: {marginHorizontal: 5},
        highlight: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
            borderColor: theme.buttonBg,
            borderWidth: 1,
        },
        reaction: {
            alignItems: 'center',
            borderRadius: 4,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            flexDirection: 'row',
            height: 32,
            justifyContent: 'center',
            marginBottom: 12,
            marginRight: 8,
            minWidth: 50,
        },
    };
});

const Reaction = ({count, emojiName, highlight, onPress, onLongPress, theme}: ReactionProps) => {
    const styles = getStyleSheet(theme);

    const handlePress = useCallback(() => {
        onPress(emojiName, highlight);
    }, [highlight]);

    return (
        <TouchableOpacity
            onPress={handlePress}
            onLongPress={onLongPress}
            delayLongPress={350}
            style={[styles.reaction, (highlight && styles.highlight)]}
        >
            <View style={styles.emoji}>
                <Emoji
                    emojiName={emojiName}
                    size={20}
                    textStyle={styles.customEmojiStyle}
                    testID={`reaction.emoji.${emojiName}`}
                />
            </View>
            <View style={styles.countContainer}>
                <AnimatedNumbers
                    includeComma={false}
                    fontStyle={[styles.count, (highlight && styles.countHighlight)]}
                    animateToNumber={count}
                    animationDuration={450}
                />
            </View>
        </TouchableOpacity>
    );
};

export default Reaction;

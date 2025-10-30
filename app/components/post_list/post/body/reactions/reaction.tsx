// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {TouchableOpacity, View} from 'react-native';

import AnimatedNumbers from '@components/animated_number';
import Emoji from '@components/emoji';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type ReactionProps = {
    count: number;
    emojiName: string;
    highlight: boolean;
    onPress: (emojiName: string, highlight: boolean) => void;
    onLongPress: (initialEmoji: string) => void;
    theme: Theme;
}

const MIN_WIDTH = 36;
const DIGIT_WIDTH = 4;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        count: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            ...typography('Body', 100, 'SemiBold'),
        },
        countContainer: {marginRight: 4},
        countHighlight: {
            color: theme.buttonBg,
        },
        customEmojiStyle: {color: '#000'},
        emoji: {marginHorizontal: 3},
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
            height: 24,
            justifyContent: 'center',
            marginBottom: 4,
            marginRight: 4,
            minWidth: MIN_WIDTH,
        },
    };
});

const Reaction = ({count, emojiName, highlight, onPress, onLongPress, theme}: ReactionProps) => {
    const styles = getStyleSheet(theme);
    const digits = String(count).length;
    const containerStyle = useMemo(() => {
        const minWidth = MIN_WIDTH + (digits * DIGIT_WIDTH);
        return [styles.reaction, (highlight && styles.highlight), {minWidth}];
    }, [styles.reaction, highlight, digits]);

    const handleLongPress = useCallback(() => {
        onLongPress(emojiName);
    }, []);

    const handlePress = useCallback(() => {
        onPress(emojiName, highlight);
    }, [highlight]);

    const fontStyle = useMemo(() => [styles.count, (highlight && styles.countHighlight)], [styles, highlight]);

    return (
        <TouchableOpacity
            onPress={handlePress}
            onLongPress={handleLongPress}
            delayLongPress={350}
            style={containerStyle}
        >
            <View style={styles.emoji}>
                <Emoji
                    emojiName={emojiName}
                    size={12}
                    textStyle={styles.customEmojiStyle}
                    testID={`reaction.emoji.${emojiName}`}
                />
            </View>
            <View style={styles.countContainer}>
                <AnimatedNumbers
                    fontStyle={fontStyle}
                    animateToNumber={count}
                    animationDuration={450}
                />
            </View>
        </TouchableOpacity>
    );
};

export default React.memo(Reaction);

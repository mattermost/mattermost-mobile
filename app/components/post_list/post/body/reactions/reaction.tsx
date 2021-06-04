// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Platform, Text} from 'react-native';

import Emoji from '@components/emoji';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {Theme} from '@mm-redux/types/preferences';

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
            color: theme.linkColor,
            marginLeft: 6,
        },
        customEmojiStyle: {marginHorizontal: 3},
        highlight: {backgroundColor: changeOpacity(theme.linkColor, 0.1)},
        reaction: {
            alignItems: 'center',
            borderRadius: 2,
            borderColor: changeOpacity(theme.linkColor, 0.4),
            borderWidth: 1,
            flexDirection: 'row',
            height: 30,
            marginRight: 6,
            marginBottom: 5,
            marginTop: 10,
            paddingHorizontal: 6,
            paddingBottom: Platform.select({android: 2}),
        },
    };
});

const Reaction = ({count, emojiName, highlight, onPress, onLongPress, theme}: ReactionProps) => {
    const styles = getStyleSheet(theme);

    const handlePress = useCallback(() => {
        onPress(emojiName, highlight);
    }, []);

    return (
        <TouchableWithFeedback
            onPress={handlePress}
            onLongPress={onLongPress}
            delayLongPress={350}
            style={[styles.reaction, (highlight && styles.highlight)]}
            type={'opacity'}
        >
            <Emoji
                emojiName={emojiName}
                size={20}
                textStyle={{color: 'black', fontWeight: 'bold'}}
                customEmojiStyle={styles.customEmojiStyle}
                testID={`reaction.emoji.${emojiName}`}
            />
            <Text
                style={styles.count}
                testID={`reaction.emoji.${emojiName}.count`}
            >
                {count}
            </Text>
        </TouchableWithFeedback>
    );
};

export default Reaction;

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View, StyleSheet, type StyleProp, type TextStyle} from 'react-native';

import Emoji from '@components/emoji';
import {reEmoji, reEmoticon, reMain} from '@constants/emoji';
import {getEmoticonName} from '@utils/emoji/helpers';

type Props = {
    message: string;
    style: StyleProp<TextStyle>;
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
});

const ActionButtonText = ({message, style}: Props) => {
    const components: React.ReactNode[] = [];

    let text = message;
    while (text) {
        let match;

        // See if the text starts with an emoji
        if ((match = text.match(reEmoji))) {
            components.push(
                <Emoji
                    key={components.length}
                    literal={match[0]}
                    emojiName={match[1]}
                    textStyle={style}
                />,
            );
            text = text.substring(match[0].length);
            continue;
        }

        // Or an emoticon
        if ((match = text.match(reEmoticon))) {
            const emoticonName = getEmoticonName(match[0]);
            if (emoticonName) {
                components.push(
                    <Emoji
                        key={components.length}
                        literal={match[0]}
                        emojiName={emoticonName}
                        textStyle={style}
                    />,
                );
                text = text.substring(match[0].length);
                continue;
            }
        }

        // This is plain text, so capture as much text as possible until we hit the next possible emoji. Note that
        // reMain always captures at least one character, so text will always be getting shorter
        match = text.match(reMain);
        if (!match) {
            continue;
        }

        components.push(
            <Text
                key={components.length}
                style={style}
            >
                {match[0]}
            </Text>,
        );
        text = text.substring(match[0].length);
    }

    return (
        <View style={styles.container}>
            {components}
        </View>
    );
};

export default ActionButtonText;

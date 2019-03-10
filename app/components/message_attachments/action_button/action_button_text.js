// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {Text, View, StyleSheet} from 'react-native';
import Emoji from 'app/components/emoji';
import {getEmoticonName} from 'app/utils/emoji_utils';

// reEmoji matches an emoji (eg. :taco:) at the start of a string.
const reEmoji = /^:([a-z0-9_\-+]+):\B/i;

// reEmoticon matches an emoticon (eg. :D) at the start of a string.
const reEmoticon = /^(?:(:-?\))|(;-?\))|(:o)|(:-o)|(:-?])|(:-?d)|(x-d)|(:-?p)|(:-?[[@])|(:-?\()|(:['’]-?\()|(:-?\/)|(:-?s)|(:-?\|)|(:-?\$)|(:-x)|(<3|&lt;3)|(<\/3|&lt;\/3)|(:[`'’]-?\(|:&#x27;\(|:&#39;\())(?=$|\s|[*_~?])/i;

// reMain matches some amount of plain text, starting at the beginning of the string and hopefully stopping right
// before the next emoji by looking for any character that could start an emoji (:, ;, x, or <)
const reMain = /^[\s\S]+?(?=[:;x<]|$)/i;

export default function ActionButtonText({message, style}) {
    const components = [];

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
                />
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
                    />
                );
                text = text.substring(match[0].length);
                continue;
            }
        }

        // This is plain text, so capture as much text as possible until we hit the next possible emoji. Note that
        // reMain always captures at least one character, so text will always be getting shorter
        match = text.match(reMain);

        components.push(
            <Text
                key={components.length}
                style={style}
            >
                {match[0]}
            </Text>
        );
        text = text.substring(match[0].length);
    }

    return (
        <View style={styles.container}>
            {components}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
});

ActionButtonText.propTypes = {
    message: PropTypes.string.isRequired,
    style: PropTypes.object.isRequired,
};
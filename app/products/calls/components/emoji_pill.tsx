// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import Emoji from '@components/emoji';
import {typography} from '@utils/typography';

const styles = StyleSheet.create({
    pill: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.16)',
        borderRadius: 20,
        height: 30,
        paddingLeft: 16,
        paddingRight: 16,
        marginLeft: 6,
    },
    count: {
        ...typography('Body', 75, 'SemiBold'),
        color: 'white',
        marginLeft: 8,
    },
});

interface Props {
    name: string;
    count: number;
    literal?: string;
}

const EmojiPill = ({name, literal, count}: Props) => {
    return (
        <View style={styles.pill}>
            <Emoji
                emojiName={name}
                literal={literal}
                size={18}
            />
            <Text style={styles.count}>{count}</Text>
        </View>
    );
};

export default EmojiPill;

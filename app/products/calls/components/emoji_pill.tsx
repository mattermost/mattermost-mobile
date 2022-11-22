// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import Emoji from '@components/emoji';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => (
    {
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
            color: theme.buttonColor,
            marginLeft: 8,
        },
    }
));

interface Props {
    name: string;
    count: number;
}

const EmojiPill = ({name, count}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.pill}>
            <Emoji
                emojiName={name}
                size={18}
            />
            <Text style={styles.count}>{count}</Text>
        </View>
    );
};

export default EmojiPill;

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import {useTheme} from '@context/theme';
import {getEmojiByName} from '@utils/emoji/helpers';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    emoji: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        marginBottom: 16,
    },
    title: {
        color: theme.centerChannelColor,
        ...typography('Body', 75, 'SemiBold'),
    },
}));

const EmojiAliases = ({emoji}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const aliases = getEmojiByName(emoji, [])?.short_names?.map((n: string) => `:${n}:`).join('  ') || `:${emoji}:`;

    return (
        <View style={style.container}>
            <Text
                ellipsizeMode='tail'
                numberOfLines={1}
                style={style.title}
                testID={`emoji_aliases.${emoji}`}
            >
                {aliases}
            </Text>
        </View>
    );
};

export default EmojiAliases;

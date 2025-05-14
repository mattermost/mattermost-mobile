// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type TagProps = {
    text: string;
    type: 'info' | 'warning' | 'error';
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        tag: {
            borderRadius: 4,
            paddingHorizontal: 12,
            paddingVertical: 4,
            marginRight: 8,
            marginBottom: 4,
        },
        tagText: {
            ...typography('Heading', 75, 'SemiBold'),
        },

        // All tag types use the same styling based on design requirements
        tagBackground: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        },
        tagTextColor: {
            color: theme.centerChannelColor,
        },
    };
});

const Tag = ({text}: TagProps) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);

    return (
        <View
            style={[styles.tag, styles.tagBackground]}
            accessibilityRole='text'
        >
            <Text style={[styles.tagText, styles.tagTextColor]}>
                {text}
            </Text>
        </View>
    );
};

export default Tag;

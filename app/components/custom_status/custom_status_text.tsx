// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, TextStyle} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import FormattedText from '@components/formatted_text';
import type {Theme} from '@mm-redux/types/preferences';

interface ComponentProps {
    text: string | FormattedText;
    theme: Theme;
    textStyle?: TextStyle;
    ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
    numberOfLines?: number;
}

const CustomStatusText = ({text, theme, textStyle, ellipsizeMode, numberOfLines}: ComponentProps) => (
    <Text
        style={[getStyleSheet(theme).label, textStyle]}
        ellipsizeMode={ellipsizeMode}
        numberOfLines={numberOfLines}
    >
        {text}
    </Text>
);

export default CustomStatusText;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        label: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            flex: 1,
            fontSize: 17,
            textAlignVertical: 'center',
            includeFontPadding: false,
        },
    };
});

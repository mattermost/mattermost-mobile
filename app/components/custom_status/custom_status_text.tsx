// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, type TextStyle} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

interface ComponentProps {
    text: string | React.ReactNode;
    theme: Theme;
    textStyle?: TextStyle;
    ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
    numberOfLines?: number;
    testID?: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        label: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 17,
            textAlignVertical: 'center',
            includeFontPadding: false,
        },
    };
});

const CustomStatusText = ({text, theme, textStyle, ellipsizeMode, numberOfLines, testID}: ComponentProps) => (
    <Text
        style={[getStyleSheet(theme).label, textStyle]}
        ellipsizeMode={ellipsizeMode}
        numberOfLines={numberOfLines}
        testID={testID}
    >
        {text}
    </Text>
);

export default CustomStatusText;

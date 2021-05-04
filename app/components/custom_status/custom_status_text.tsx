// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import type {Theme} from '@mm-redux/types/preferences';
import {Text, TextStyle} from 'react-native';

interface ComponentProps {
    text: string;
    theme: Theme;
    textStyle?: TextStyle
}

const CustomStatusText = ({text, theme, textStyle}: ComponentProps) => (
    <Text style={[getStyleSheet(theme).label, textStyle]}>
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

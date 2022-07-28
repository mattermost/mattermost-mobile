// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, StyleProp, Text, TextStyle} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        rightLabel: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            ...typography('Body', 100, 'Regular'),
            alignSelf: 'center',
            ...Platform.select({
                android: {
                    marginRight: 20,
                },
            }),
        },
    };
});

type SettingRowLabelProps = {
    text: string;
    textStyle?: StyleProp<TextStyle>;
}
const SettingRowLabel = ({text, textStyle}: SettingRowLabelProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <Text
            style={[styles.rightLabel, textStyle]}
        >
            {text}
        </Text>

    );
};

export default SettingRowLabel;

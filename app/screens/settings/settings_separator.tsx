// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, StyleProp, View, ViewStyle} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        separator: {
            ...Platform.select({
                ios: {
                    backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
                    width: '91%',
                    alignSelf: 'center',
                    height: 1,
                    marginTop: 12,
                },
                default: {
                    display: 'none',
                },
            }),
        },
    };
});
type SettingSeparatorProps = {
    lineStyles?: StyleProp<ViewStyle>;
}

const SettingSeparator = ({lineStyles}: SettingSeparatorProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (<View style={[styles.separator, lineStyles]}/>);
};

export default SettingSeparator;

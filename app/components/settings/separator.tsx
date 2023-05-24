// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, type StyleProp, View, type ViewStyle} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    const groupSeparator: ViewStyle = {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.12),
        width: '91%',
        alignSelf: 'center',
        height: 1,
    };
    return {
        separator: {
            ...Platform.select({
                ios: {
                    ...groupSeparator,
                },
                default: {
                    display: 'none',
                },
            }),
        },
        groupSeparator: {
            ...groupSeparator,
            marginBottom: 16,
        },
    };
});
type SettingSeparatorProps = {
    lineStyles?: StyleProp<ViewStyle>;
    isGroupSeparator?: boolean;
}

const SettingSeparator = ({lineStyles, isGroupSeparator = false}: SettingSeparatorProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (<View style={[styles.separator, isGroupSeparator && styles.groupSeparator, lineStyles]}/>);
};

export default SettingSeparator;

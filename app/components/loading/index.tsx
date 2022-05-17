// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {ActivityIndicator, View, ViewStyle} from 'react-native';

import {useTheme} from '@context/theme';

type LoadingProps = {
    containerStyle?: ViewStyle;
    size?: number | 'small' | 'large';
    color?: string;
    themeColor?: keyof Theme;
}

const Loading = ({containerStyle, size, color, themeColor}: LoadingProps) => {
    const theme = useTheme();
    const indicatorColor = themeColor ? theme[themeColor] : color;

    return (
        <View style={containerStyle}>
            <ActivityIndicator
                color={indicatorColor}
                size={size}
            />
        </View>
    );
};

export default Loading;

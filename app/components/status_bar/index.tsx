// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getThemeFromState} from '@screens/navigation';
import React from 'react';
import {Platform, StatusBar as NativeStatusBar, StatusBarStyle} from 'react-native';
import tinyColor from 'tinycolor2';

type StatusBarProps = {
    theme?: Theme;
    headerColor?: string;
}

const StatusBar = ({theme, headerColor}: StatusBarProps) => {
    const zTheme: Theme = theme ?? getThemeFromState();
    const color = headerColor ? tinyColor(headerColor) : tinyColor(zTheme.sidebarHeaderBg);
    const barStyle: StatusBarStyle = color.isLight() && Platform.OS === 'ios' ? 'dark-content' : 'light-content';

    return (
        <NativeStatusBar barStyle={barStyle}/>
    );
};

export default StatusBar;

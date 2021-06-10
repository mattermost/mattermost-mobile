// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, StatusBar as NativeStatusBar} from 'react-native';
import tinyColor from 'tinycolor2';

// export default class StatusBar extends PureComponent {
//     static propTypes = {
//         theme: PropTypes.object.isRequired,
//         headerColor: PropTypes.string,
//     };
//
//     render() {
//         const {theme} = this.props;
//         let headerColor = tinyColor(theme.sidebarHeaderBg);
//         if (this.props.headerColor) {
//             headerColor = tinyColor(this.props.headerColor);
//         }
//         let barStyle = 'light-content';
//         if (headerColor.isLight() && Platform.OS === 'ios') {
//             barStyle = 'dark-content';
//         }
//
//         return <NativeStatusBar barStyle={barStyle}/>;
//     }
// }

//todo: retrieve Theme from the Preference entity and if it is not found, default it to getThemeFromState method
//todo: use WDB hook ?

type StatusBarProps = {
    theme: Theme;
    headerColor?: string;
}

const StatusBar = ({theme, headerColor}: StatusBarProps) => {
    const color = headerColor ? tinyColor(headerColor) : tinyColor(theme.sidebarHeaderBg);

    let barStyle = 'light-content';
    if (color.isLight() && Platform.OS === 'ios') {
        barStyle = 'dark-content';
    }
    return (
        <NativeStatusBar barStyle={barStyle}/>
    );
};

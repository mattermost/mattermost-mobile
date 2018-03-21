// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {StyleSheet} from 'react-native';

import * as ThemeUtils from 'mattermost-redux/utils/theme_utils';

export function makeStyleSheetFromTheme(getStyleFromTheme) {
    return ThemeUtils.makeStyleFromTheme((theme) => {
        return StyleSheet.create(getStyleFromTheme(theme));
    });
}

export const changeOpacity = ThemeUtils.changeOpacity;

export const blendColors = ThemeUtils.blendColors;

export function concatStyles(...styles) {
    return [].concat(styles);
}

export function setNavigatorStyles(navigator, theme) {
    navigator.setStyle({
        navBarTextColor: theme.sidebarHeaderTextColor,
        navBarBackgroundColor: theme.sidebarHeaderBg,
        navBarButtonColor: theme.sidebarHeaderTextColor,
        screenBackgroundColor: theme.centerChannelBg,
    });
}

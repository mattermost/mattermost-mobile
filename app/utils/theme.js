// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {StyleSheet} from 'react-native';

import * as ThemeUtils from 'mattermost-redux/utils/theme_utils';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import Preferences from 'mattermost-redux/constants/preferences';

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

export function getAllowedThemes(state) {
    const allowedThemeKeys = getConfig(state).AllowedThemes.split(',');
    const allowedThemes = [];
    allowedThemeKeys.forEach((key) => {
        if (!Preferences.THEMES.hasOwnProperty(key)) {
            return;
        }
        allowedThemes.push({
            ...Preferences.THEMES[key],
            key,
        });
    });
    return allowedThemes;
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {StyleSheet} from 'react-native';
import tinyColor from 'tinycolor2';

import * as ThemeUtils from 'mattermost-redux/utils/theme_utils';

import {mergeNavigationOptions} from 'app/actions/navigation';

const MODAL_SCREENS_WITHOUT_BACK = [
    'AddReaction',
    'ChannelInfo',
    'ClientUpgrade',
    'CreateChannel',
    'EditPost',
    'ErrorTeamsList',
    'MoreChannels',
    'MoreDirectMessages',
    'SelectTeam',
    'Settings',
    'TermsOfService',
    'UserProfile',
];

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

export function setNavigatorStyles(componentId, theme) {
    const options = {
        topBar: {
            title: {
                color: theme.sidebarHeaderTextColor,
            },
            background: {
                color: theme.sidebarHeaderBg,
            },
            leftButtonColor: theme.sidebarHeaderTextColor,
            rightButtonColor: theme.sidebarHeaderTextColor,
        },
        layout: {
            componentBackgroundColor: theme.centerChannelBg,
        },
    };

    if (!MODAL_SCREENS_WITHOUT_BACK.includes(componentId)) {
        options.topBar.backButton = {
            color: theme.sidebarHeaderTextColor,
        };
    }

    mergeNavigationOptions(componentId, options);
}

export function isThemeSwitchingEnabled(state) {
    const {config} = state.entities.general;
    return config.EnableThemeSelection === 'true';
}

export function getKeyboardAppearanceFromTheme(theme) {
    return tinyColor(theme.centerChannelBg).isLight() ? 'light' : 'dark';
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

import Preferences from 'app/constants/preferences';
import {getConfig, getCurrentTeamId} from 'app/selectors/realm/general';

export const getDefaultTheme = createSelector(
    getConfig,
    (config) => {
        if (config?.DefaultTheme) {
            const theme = Preferences.THEMES[config.DefaultTheme];
            if (theme) {
                return theme;
            }
        }

        // If no config.DefaultTheme or value doesn't refer to a valid theme name...
        return Preferences.THEMES.default;
    }
);

const getThemePreference = createSelector(
    getCurrentTeamId,
    (general, themePreference) => themePreference,
    (currentTeamId, themePreference) => {
        let teamTheme;

        if (currentTeamId) {
            teamTheme = themePreference.filtered(`name="${currentTeamId}"`)[0];
        }

        if (!teamTheme) {
            teamTheme = themePreference.filtered('name=""')[0];
        }

        return teamTheme;
    }
);

export const getTheme = createSelector(
    getThemePreference,
    getDefaultTheme,
    (themePreference, defaultTheme) => {
        let theme;
        if (themePreference?.value) {
            theme = themePreference.value;
        } else {
            theme = defaultTheme;
        }

        if (typeof theme === 'string') {
            // A custom theme will be a JSON-serialized object stored in a preference
            theme = JSON.parse(theme);
        }

        // At this point, the theme should be a plain object

        // If this is a system theme, find it in case the user's theme is missing any fields
        if (theme.type && theme.type !== 'custom') {
            const match = Object.values(Preferences.THEMES).find((v) => v.type === theme.type);
            if (match) {
                if (!match.mentionBg) {
                    match.mentionBg = match.mentionBj;
                }

                return match;
            }
        }

        for (const key of Object.keys(defaultTheme)) {
            if (theme[key]) {
                // Fix a case where upper case theme colours are rendered as black
                theme[key] = theme[key].toLowerCase();
            }
        }

        // Backwards compatability with old name
        if (!theme.mentionBg) {
            theme.mentionBg = theme.mentionBj;
        }

        return Object.assign({}, defaultTheme, theme);
    }
);

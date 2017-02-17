// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {createSelector} from 'reselect';

import Config from 'assets/config.json';
import Themes from 'assets/themes.json';

import {Preferences} from 'service/constants';
import {getPreferenceKey} from 'service/utils/preference_utils';

import {getCurrentTeamId} from './teams';

export function getMyPreferences(state) {
    return state.entities.preferences.myPreferences;
}

export const getTheme = createSelector(
    getMyPreferences,
    getCurrentTeamId,
    (myPreferences, currentTeamId) => {
        // Prefer the user's current team-specific theme over the user's current global theme over the default theme
        let themePreference;
        if (currentTeamId) {
            themePreference = myPreferences[getPreferenceKey(Preferences.CATEGORY_THEME, currentTeamId)];
        }

        if (!themePreference) {
            themePreference = myPreferences[getPreferenceKey(Preferences.CATEGORY_THEME, '')];
        }

        let theme;
        if (themePreference) {
            theme = themePreference.value;
        } else {
            theme = Config.DefaultTheme;
        }

        if (typeof theme === 'string') {
            try {
                // A custom theme will be a JSON-serialized object stored in a preference
                theme = JSON.parse(theme);
            } catch (e) {
                // But if it's not a JSON object, it must be the name of a default theme
                theme = Themes[theme];
            }
        }

        // At this point, the theme should be a plain object

        return theme;
    }
);

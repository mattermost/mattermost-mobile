// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

import Preferences from 'mattermost-redux/constants/preferences';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

export const getAllowedThemes = createSelector(
    getConfig,
    getTheme,
    (config, activeTheme) => {
        const allThemes = Object.keys(Preferences.THEMES).map((key) => ({
            ...Preferences.THEMES[key],
            key,
        }));
        let acceptableThemes = allThemes;
        const allowedThemeKeys = (config.AllowedThemes || '').split(',').filter(String);
        if (allowedThemeKeys.length) {
            acceptableThemes = allThemes.filter((theme) => allowedThemeKeys.includes(theme.key));
        }
        if (config.AllowCustomThemes === 'true' && activeTheme.type === 'custom') {
            acceptableThemes.push({
                ...activeTheme,
                key: 'custom',
            });
        }
        return acceptableThemes;
    }
);
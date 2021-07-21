// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

import Preferences from '@mm-redux/constants/preferences';
import {getConfig} from '@mm-redux/selectors/entities/general';

export const getAllowedThemes = createSelector(
    getConfig,
    (config) => {
        const allThemes = Object.keys(Preferences.THEMES).map((key) => ({
            ...Preferences.THEMES[key],
            key,
        }));
        let acceptableThemes = allThemes;
        const allowedThemeKeys = (config.AllowedThemes || '').split(',').filter(String);
        if (allowedThemeKeys.length) {
            acceptableThemes = allThemes.filter((theme) => allowedThemeKeys.includes(theme.key));
        }
        return acceptableThemes;
    },
);

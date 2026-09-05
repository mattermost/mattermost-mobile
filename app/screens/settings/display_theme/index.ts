// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeThemeAutoSwitchPreference, queryDarkThemePreferences, queryThemePreferences} from '@queries/servers/preference';
import {
    observeAllowedThemesKeys,
    observeCurrentTeamId,
    observeCurrentUserId,
} from '@queries/servers/system';

import DisplayTheme from './display_theme';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';

const parseTheme = (prefs: PreferenceModel[]) => {
    if (prefs.length > 0) {
        try {
            return of$(JSON.parse(prefs[0].value) as Theme);
        } catch {
            // ignore
        }
    }
    return of$(undefined);
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = observeCurrentTeamId(database);
    const currentUserId = observeCurrentUserId(database);

    return {
        allowedThemeKeys: observeAllowedThemesKeys(database),
        currentTeamId,
        currentUserId,
        themeAutoSwitch: observeThemeAutoSwitchPreference(database),
        lightTheme: currentTeamId.pipe(
            switchMap((teamId) =>
                queryThemePreferences(database, teamId).observeWithColumns(['value']).pipe(
                    switchMap(parseTheme),
                ),
            ),
        ),
        darkTheme: currentTeamId.pipe(
            switchMap((teamId) =>
                queryDarkThemePreferences(database, teamId).observeWithColumns(['value']).pipe(
                    switchMap(parseTheme),
                ),
            ),
        ),
    };
});

export default withDatabase(enhanced(DisplayTheme));

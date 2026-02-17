// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryDarkThemePreferences, queryThemeAutoSwitchPreference} from '@queries/servers/preference';
import {
    observeAllowedThemesKeys,
    observeCurrentTeamId,
    observeCurrentUserId,
} from '@queries/servers/system';

import DisplayTheme from './display_theme';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';

const parseDarkThemeType = (prefs: PreferenceModel[]) => {
    if (prefs.length > 0) {
        try {
            const parsed = JSON.parse(prefs[0].value) as Theme;
            return of$(parsed.type?.toLowerCase());
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
        themeAutoSwitch: queryThemeAutoSwitchPreference(database).observeWithColumns(['value']).pipe(
            switchMap((prefs) => of$(prefs.length > 0 && prefs[0].value === 'true')),
        ),
        darkThemeType: currentTeamId.pipe(
            switchMap((teamId) =>
                queryDarkThemePreferences(database, teamId).observeWithColumns(['value']).pipe(
                    switchMap(parseDarkThemeType),
                ),
            ),
        ),
    };
});

export default withDatabase(enhanced(DisplayTheme));

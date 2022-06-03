// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {
    observeAllowedThemesKeys,
    observeConfigBooleanValue,
    observeCurrentTeamId,
    observeCurrentUserId,
} from '@queries/servers/system';
import {WithDatabaseArgs} from '@typings/database/database';
import {safeParseJSON} from '@utils/helpers';

import DisplayTheme from './display_theme';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = observeCurrentTeamId(database);
    const currentUserId = observeCurrentUserId(database);
    const themePreferences = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_THEME).observe();
    const configAllowCustomThemes = observeConfigBooleanValue(database, 'AllowCustomThemes');

    const customTheme = combineLatest([currentTeamId, themePreferences, configAllowCustomThemes]).pipe(
        switchMap(([teamId, themePrefs, awCustomTheme]) => {
            if (!awCustomTheme) {
                return of$(undefined);
            }
            // eslint-disable-next-line max-nested-callbacks
            const t = themePrefs.find((pref) => pref.name === teamId)?.value;
            // eslint-disable-next-line max-nested-callbacks
            const e = themePrefs.find((pref) => pref.name === '')?.value;

            const themePref = t ? of$(t) : of$(e);
            return themePref;
        }),
        switchMap((cth) => {
            if (cth) {
                const thx = safeParseJSON(cth) as unknown as Record<string, string>;
                if (thx?.type === 'custom') {
                    return of$(thx);
                }
            }

            return of$(undefined);
        }),
    );

    return {
        allowedThemeKeys: observeAllowedThemesKeys(database),
        currentTeamId,
        currentUserId,
        customTheme,
    };
});

export default withDatabase(enhanced(DisplayTheme));

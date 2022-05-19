// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeAllowedThemes, observeConfigBooleanValue} from '@queries/servers/system';
import {WithDatabaseArgs} from '@typings/database/database';

import DisplaySettings from './display';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const isTimezoneEnabled = observeConfigBooleanValue(database, 'ExperimentalTimezone');

    const allowsThemeSwitching = observeConfigBooleanValue(database, 'EnableThemeSelection');
    const allowedThemes = observeAllowedThemes(database);

    const isThemeSwitchingEnabled = combineLatest([allowsThemeSwitching, allowedThemes]).pipe(
        switchMap(([ts, ath]) => {
            return of$(ts && ath.length > 1);
        }),
    );

    return {
        isTimezoneEnabled,
        isThemeSwitchingEnabled,
    };
});

export default withDatabase(enhanced(DisplaySettings));

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {getDisplayNamePreferenceAsBool} from '@helpers/api/preference';
import {queryDisplayNamePreferences} from '@queries/servers/preference';

import DateTimeSelector from './date_time_selector';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    isMilitaryTime: queryDisplayNamePreferences(database, Preferences.USE_MILITARY_TIME).
        observeWithColumns(['value']).pipe(
            switchMap(
                (preferences) => of$(getDisplayNamePreferenceAsBool(preferences, Preferences.USE_MILITARY_TIME, false)),
            ),
        ),
}));

export default withDatabase(enhanced(DateTimeSelector));

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap, combineLatestWith} from 'rxjs/operators';

import {Preferences} from '@constants';
import {getPreferenceValue} from '@helpers/api/preference';
import {queryCategoriesByTeamIds} from '@queries/servers/categories';
import {querySidebarPreferences} from '@queries/servers/preference';
import {observeConfigBooleanValue, observeCurrentTeamId, observeOnlyUnreads} from '@queries/servers/system';

import Categories from './categories';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';

const enhanced = withObservables(
    [],
    ({database}: WithDatabaseArgs) => {
        const currentTeamId = observeCurrentTeamId(database);
        const categories = currentTeamId.pipe(switchMap((ctid) => queryCategoriesByTeamIds(database, [ctid]).observeWithColumns(['sort_order'])));

        const unreadsOnTopUserPreference = querySidebarPreferences(database, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS).
            observeWithColumns(['value']).
            pipe(
                switchMap((prefs: PreferenceModel[]) => of$(getPreferenceValue<string>(prefs, Preferences.CATEGORIES.SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS))),
            );

        const unreadsOnTopServerPreference = observeConfigBooleanValue(database, 'ExperimentalGroupUnreadChannels');

        const unreadsOnTop = unreadsOnTopServerPreference.pipe(
            combineLatestWith(unreadsOnTopUserPreference),
            switchMap(([s, u]) => {
                if (!u) {
                    return of$(s);
                }

                return of$(u !== 'false');
            }),
        );
        return {
            categories,
            onlyUnreads: observeOnlyUnreads(database),
            unreadsOnTop,
        };
    });

export default withDatabase(enhanced(Categories));

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {getSidebarPreferenceAsBool} from '@helpers/api/preference';
import {queryCategoriesByTeamIds} from '@queries/servers/categories';
import {querySidebarPreferences} from '@queries/servers/preference';
import {observeCurrentTeamId, observeOnlyUnreads} from '@queries/servers/system';

import Categories from './categories';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';

const enhanced = withObservables(
    [],
    ({database}: WithDatabaseArgs) => {
        const currentTeamId = observeCurrentTeamId(database);
        const categories = currentTeamId.pipe(switchMap((ctid) => queryCategoriesByTeamIds(database, [ctid]).observeWithColumns(['sort_order'])));

        const unreadsOnTop = querySidebarPreferences(database, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS).
            observeWithColumns(['value']).
            pipe(
                switchMap((prefs: PreferenceModel[]) => of$(getSidebarPreferenceAsBool(prefs, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS))),
            );

        return {
            categories,
            onlyUnreads: observeOnlyUnreads(database),
            unreadsOnTop,
        };
    });

export default withDatabase(enhanced(Categories));

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {AppStateStatus} from 'react-native';
import {combineLatest, of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {queryThreadsInTeam} from '@app/queries/servers/thread';
import {Preferences} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';

import ThreadsList, {Tab} from './threads_list';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type SystemModel from '@typings/database/models/servers/system';

export type {Tab};

const {SERVER: {PREFERENCE, SYSTEM}} = MM_TABLES;

const enhanced = withObservables(['tab', 'teamId', 'forceQueryAfterAppState'], ({database, tab, teamId}: {tab: Tab; teamId: string; forceQueryAfterAppState: AppStateStatus} & WithDatabaseArgs) => {
    // Get current user
    const currentUserId = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap(({value}) => of$(value)),
    );

    const getOnlyUnreads = tab !== 'all';

    // Get all/unread threads
    const threads = queryThreadsInTeam(database, teamId, getOnlyUnreads, true).observe();

    // Get unreads count
    const unreadsCount = queryThreadsInTeam(database, teamId, true).observeCount();

    // Get team name display setting
    const config = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG);
    const license = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.LICENSE);
    const preferences = database.get<PreferenceModel>(PREFERENCE).query(Q.where('category', Preferences.CATEGORY_DISPLAY_SETTINGS)).observe();
    const teammateNameDisplay = combineLatest([config, license, preferences]).pipe(
        map(
            ([{value: cfg}, {value: lcs}, prefs]) => getTeammateNameDisplaySetting(prefs, cfg, lcs),
        ),
    );

    return {
        currentUserId,
        unreadsCount,
        teammateNameDisplay,
        threads,
    };
});

export default withDatabase(enhanced(ThreadsList));

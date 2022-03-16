// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {processIsCRTEnabled} from '@helpers/api/preference';
import {queryUnreadsAndMentionsInTeam} from '@queries/servers/thread';

import Threads from './threads';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type SystemModel from '@typings/database/models/servers/system';

const {SERVER: {PREFERENCE, SYSTEM}} = MM_TABLES;

const withIsCRTEnabled = withObservables([], ({database}: WithDatabaseArgs) => {
    const config = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG);
    const preferences = database.get<PreferenceModel>(PREFERENCE).query(Q.where('category', Preferences.CATEGORY_DISPLAY_SETTINGS)).observe();
    const isCRTEnabled = combineLatest([config, preferences]).pipe(
        map(
            ([{value: cfg}, prefs]) => processIsCRTEnabled(prefs, cfg),
        ),
    );

    const currentTeamId = database.collections.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID).pipe(
        map(({value}: {value: string}) => value),
    );

    return {
        isCRTEnabled,
        unreadsAndMentions: combineLatest([isCRTEnabled, currentTeamId]).pipe(
            switchMap(
                ([iCE, teamId]) => {
                    if (!iCE) {
                        return of$({unreads: 0, mentions: 0});
                    }
                    return queryUnreadsAndMentionsInTeam(database, teamId);
                },
            ),
        ),
    };
});

export default withDatabase(withIsCRTEnabled(Threads));

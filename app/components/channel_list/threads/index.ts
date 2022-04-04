// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {observeIsCRTEnabled, queryUnreadsAndMentionsInTeam} from '@queries/servers/thread';

import Threads from './threads';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';

const {SERVER: {SYSTEM}} = MM_TABLES;

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = database.collections.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID).pipe(
        map(({value}: {value: string}) => value),
    );

    const isCRTEnabledObserver = observeIsCRTEnabled(database);

    return {
        isCRTEnabled: isCRTEnabledObserver,
        unreadsAndMentions: combineLatest([isCRTEnabledObserver, currentTeamId]).pipe(
            switchMap(
                ([isCRTEnabled, teamId]) => {
                    if (!isCRTEnabled) {
                        return of$({unreads: 0, mentions: 0});
                    }
                    return queryUnreadsAndMentionsInTeam(database, teamId, true);
                },
            ),
        ),
    };
});

export default withDatabase(enhanced(Threads));

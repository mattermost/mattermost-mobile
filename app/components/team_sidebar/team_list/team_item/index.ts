// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {MyChannelModel} from '@database/models/server';

import TeamItem from './team_item';

import type {WithDatabaseArgs} from '@typings/database/database';
import type MyTeamModel from '@typings/database/models/servers/my_team';
import type SystemModel from '@typings/database/models/servers/system';

const {SERVER: {SYSTEM, MY_CHANNEL, CHANNEL}} = MM_TABLES;

const withSystem = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID).pipe(
        switchMap((t) => of$(t.value)),
    );
    return {
        currentTeamId,
    };
});

type WithTeamsArgs = WithDatabaseArgs & {
    myTeam: MyTeamModel;
}

const withTeams = withObservables(['myTeam'], ({myTeam, database}: WithTeamsArgs) => {
    const myChannels = database.get<MyChannelModel>(MY_CHANNEL).query(Q.on(CHANNEL, Q.and(Q.where('delete_at', Q.eq(0)), Q.where('team_id', Q.eq(myTeam.id))))).observeWithColumns(['mentions_count', 'message_count']);
    const mentionCount = myChannels.pipe(
        // eslint-disable-next-line max-nested-callbacks
        switchMap((val) => of$(val.reduce((acc, v) => acc + v.mentionsCount, 0))),
    );
    const hasUnreads = myChannels.pipe(
        // eslint-disable-next-line max-nested-callbacks
        switchMap((val) => of$(val.reduce((acc, v) => acc + v.messageCount, 0) > 0)),
    );
    return {
        team: myTeam.team.observe(),
        mentionCount,
        hasUnreads,
    };
});

export default withDatabase(withSystem(withTeams(TeamItem)));

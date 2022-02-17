// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES} from '@constants/database';
import {MyChannelModel} from '@database/models/server';
import {observeCurrentTeamId} from '@queries/servers/system';

import TeamItem from './team_item';

import type {WithDatabaseArgs} from '@typings/database/database';
import type MyTeamModel from '@typings/database/models/servers/my_team';

const {SERVER: {MY_CHANNEL, CHANNEL}} = MM_TABLES;

type WithTeamsArgs = WithDatabaseArgs & {
    myTeam: MyTeamModel;
}

const enhance = withObservables(['myTeam'], ({myTeam, database}: WithTeamsArgs) => {
    const myChannels = database.get<MyChannelModel>(MY_CHANNEL).query(Q.on(CHANNEL, Q.and(Q.where('delete_at', Q.eq(0)), Q.where('team_id', Q.eq(myTeam.id))))).observeWithColumns(['mentions_count', 'is_unread']);
    const mentionCount = myChannels.pipe(
        // eslint-disable-next-line max-nested-callbacks
        switchMap((val) => of$(val.reduce((acc, v) => acc + v.mentionsCount, 0))),
    );
    const hasUnreads = myChannels.pipe(
        // eslint-disable-next-line max-nested-callbacks
        switchMap((val) => of$(val.reduce((acc, v) => acc || v.isUnread, false))),
    );

    return {
        currentTeamId: observeCurrentTeamId(database),
        team: myTeam.team.observe(),
        mentionCount,
        hasUnreads,
    };
});

export default withDatabase(enhance(TeamItem));

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryMyChannelsByTeam} from '@queries/servers/channel';
import {observeCurrentTeamId} from '@queries/servers/system';
import {observeMentionCount} from '@queries/servers/team';

import TeamItem from './team_item';

import type {WithDatabaseArgs} from '@typings/database/database';
import type MyTeamModel from '@typings/database/models/servers/my_team';

type WithTeamsArgs = WithDatabaseArgs & {
    myTeam: MyTeamModel;
}

const enhance = withObservables(['myTeam'], ({myTeam, database}: WithTeamsArgs) => {
    const myChannels = queryMyChannelsByTeam(database, myTeam.id).observeWithColumns(['mentions_count', 'is_unread']);
    const hasUnreads = myChannels.pipe(
        // eslint-disable-next-line max-nested-callbacks
        switchMap((val) => of$(val.reduce((acc, v) => acc || v.isUnread, false))),
    );

    return {
        currentTeamId: observeCurrentTeamId(database),
        team: myTeam.team.observe(),
        mentionCount: observeMentionCount(database, myTeam.id, false),
        hasUnreads,
    };
});

export default withDatabase(enhance(TeamItem));

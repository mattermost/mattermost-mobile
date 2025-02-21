// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {observeCurrentTeamId} from '@queries/servers/system';
import {observeIsTeamUnread, observeMentionCount, observeTeam} from '@queries/servers/team';

import TeamItem from './team_item';

import type {WithDatabaseArgs} from '@typings/database/database';
import type MyTeamModel from '@typings/database/models/servers/my_team';

type WithTeamsArgs = WithDatabaseArgs & {
    myTeam: MyTeamModel;
}

const enhance = withObservables(['myTeam'], ({myTeam, database}: WithTeamsArgs) => {
    const selected = observeCurrentTeamId(database).pipe(
        switchMap((ctid) => of$(ctid === myTeam.id)),
        distinctUntilChanged(),
    );

    return {
        selected,
        team: observeTeam(database, myTeam.id),
        mentionCount: observeMentionCount(database, myTeam.id, false),
        hasUnreads: observeIsTeamUnread(database, myTeam.id),
    };
});

export default withDatabase(enhance(TeamItem));

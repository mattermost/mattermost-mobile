// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {switchMap} from 'rxjs/operators';

import {observeCurrentTeamId} from '@queries/servers/system';
import {queryTeamThreadsSync, queryThreadsInTeam} from '@queries/servers/thread';
import {observeTeammateNameDisplay} from '@queries/servers/user';

import ThreadsList from './threads_list';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = {
    tab: GlobalThreadsTab;
    teamId: string;
} & WithDatabaseArgs;

const withTeamId = withObservables([], ({database}: WithDatabaseArgs) => ({
    teamId: observeCurrentTeamId(database),
}));

const enhanced = withObservables(['tab', 'teamId'], ({database, tab, teamId}: Props) => {
    const getOnlyUnreads = tab !== 'all';

    const teamThreadsSyncObserver = queryTeamThreadsSync(database, teamId).observeWithColumns(['earliest']);

    return {
        teammateNameDisplay: observeTeammateNameDisplay(database),
        threads: teamThreadsSyncObserver.pipe(
            switchMap((teamThreadsSync) => {
                const earliest = tab === 'all' ? teamThreadsSync?.[0]?.earliest : 0;
                return queryThreadsInTeam(database, teamId, {onlyUnreads: getOnlyUnreads, hasReplies: true, isFollowing: true, sort: true, earliest}).observe();
            }),
        ),
    };
});

export default withDatabase(withTeamId(enhanced(ThreadsList)));

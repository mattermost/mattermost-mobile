// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {AppStateStatus} from 'react-native';
import {switchMap} from 'rxjs/operators';

import {observeCurrentTeamId} from '@queries/servers/system';
import {queryTeamThreadsSync, queryThreadsInTeam} from '@queries/servers/thread';
import {observeTeammateNameDisplay} from '@queries/servers/user';

import ThreadsList from './threads_list';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = {
    tab: GlobalThreadsTab;
    teamId: string;
    forceQueryAfterAppState: AppStateStatus;
} & WithDatabaseArgs;

const withTeamId = withObservables([], ({database}: WithDatabaseArgs) => ({
    teamId: observeCurrentTeamId(database),
}));

const enhanced = withObservables(['tab', 'teamId', 'forceQueryAfterAppState'], ({database, tab, teamId}: Props) => {
    const getOnlyUnreads = tab !== 'all';

    const teamThreadsSyncObserver = queryTeamThreadsSync(database, teamId).observeWithColumns(['earliest']);

    return {
        unreadsCount: queryThreadsInTeam(database, teamId, true).observeCount(false),
        teammateNameDisplay: observeTeammateNameDisplay(database),
        threads: teamThreadsSyncObserver.pipe(
            switchMap((teamThreadsSync) => {
                const earliest = teamThreadsSync?.[0]?.earliest;
                return queryThreadsInTeam(database, teamId, getOnlyUnreads, false, true, true, earliest).observe();
            }),
        ),
    };
});

export default withDatabase(withTeamId(enhanced(ThreadsList)));

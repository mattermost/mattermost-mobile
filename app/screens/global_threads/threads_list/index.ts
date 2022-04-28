// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {AppStateStatus} from 'react-native';

import {observeCurrentTeamId} from '@queries/servers/system';
import {queryThreadsInTeam} from '@queries/servers/thread';
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

    return {
        unreadsCount: queryThreadsInTeam(database, teamId, true).observeCount(false),
        teammateNameDisplay: observeTeammateNameDisplay(database),
        threads: queryThreadsInTeam(database, teamId, getOnlyUnreads, false, true, true).observe(),
    };
});

export default withDatabase(withTeamId(enhanced(ThreadsList)));

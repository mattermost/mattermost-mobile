// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {distinctUntilChanged, switchMap} from '@nozbe/watermelondb/utils/rx';
import {of as of$} from 'rxjs';

import {observeCurrentTeamId, observeGlobalThreadsTab} from '@queries/servers/system';
import {queryThreadsInTeam} from '@queries/servers/thread';

import GlobalThreads from './global_threads';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const teamId = observeCurrentTeamId(database);
    const unreadsCount = teamId.pipe(switchMap((id) => queryThreadsInTeam(database, id, {onlyUnreads: true, hasReplies: true, isFollowing: true}).observeCount(false)));
    const hasUnreads = unreadsCount.pipe(
        switchMap((count) => of$(count > 0)),
        distinctUntilChanged(),
    );
    return {
        teamId,
        hasUnreads,
        globalThreadsTab: observeGlobalThreadsTab(database),
    };
});

export default withDatabase(enhanced(GlobalThreads));

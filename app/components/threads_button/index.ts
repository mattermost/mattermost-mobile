// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged, map, combineLatestWith} from 'rxjs/operators';

import {withServerUrl} from '@context/server';
import {observeCurrentChannelId, observeCurrentTeamId, observeTeamBadgeCounts} from '@queries/servers/system';
import {observeTeamLastChannelId} from '@queries/servers/team';
import {observeUnreadsAndMentions} from '@queries/servers/thread';
import ThreadsSyncStore from '@store/threads_sync_store';

import ThreadsButton from './threads_button';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    serverUrl: string;
}

const enhanced = withObservables(['serverUrl'], ({database, serverUrl}: EnhanceProps) => {
    const currentTeamId = observeCurrentTeamId(database);

    // Gate: true once fetchTeamsThreads has run for this team this session.
    // Until then, blob badge counts (server-computed aggregates) are shown.
    const threadsFetchedThisSession = currentTeamId.pipe(
        switchMap((teamId) => (teamId ? ThreadsSyncStore.observeThreadsFetched(serverUrl, teamId) : of$(false))),
        distinctUntilChanged(),
    );

    // Blob seed: current team thread count + direct thread count combined.
    const blobThreads = currentTeamId.pipe(
        combineLatestWith(observeTeamBadgeCounts(database)),
        map(([teamId, counts]) => ({
            mentions: (counts?.teams[teamId]?.threadMentionCount ?? 0) + (counts?.direct.threadMentionCount ?? 0),
            unreads: (counts?.teams[teamId]?.threadHasUnreads ?? false) || (counts?.direct.threadHasUnreads ?? false),
        })),
        distinctUntilChanged((a, b) => a.mentions === b.mentions && a.unreads === b.unreads),
    );

    // Live DB thread values — accurate once fetchTeamsThreads has completed this session.
    const dbUnreadsAndMentions = currentTeamId.pipe(
        switchMap((teamId) => observeUnreadsAndMentions(database, {teamId, includeDmGm: true})),
    );

    const unreadsAndMentions = threadsFetchedThisSession.pipe(
        combineLatestWith(dbUnreadsAndMentions, blobThreads),
        map(([fetched, db, blob]) => (fetched ? db : blob)),
        distinctUntilChanged((a, b) => a.mentions === b.mentions && a.unreads === b.unreads),
    );

    return {
        currentChannelId: observeCurrentChannelId(database),
        lastChannelId: currentTeamId.pipe(
            switchMap((teamId) => observeTeamLastChannelId(database, teamId)),
        ),
        unreadsAndMentions,
    };
});

export default withDatabase(withServerUrl(enhanced(ThreadsButton)));

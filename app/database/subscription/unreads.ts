// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type Database} from '@nozbe/watermelondb';
import {type Observable, of as of$} from 'rxjs';
import {combineLatestWith, distinctUntilChanged, map as map$, switchMap} from 'rxjs/operators';

import DatabaseManager from '@database/manager';
import {observeChannelUnreadsAndMentions, queryMyChannelsByTeam} from '@queries/servers/channel';
import {observeCurrentTeamId, observeTeamBadgeCounts} from '@queries/servers/system';
import {queryMyTeams} from '@queries/servers/team';
import {observeDirectThreadUnreadsAndMentions, observeUnreadsAndMentions} from '@queries/servers/thread';
import ThreadsSyncStore from '@store/threads_sync_store';

import type MyChannelModel from '@typings/database/models/servers/my_channel';

export type UnreadObserverArgs = {
    myChannels: MyChannelModel[];
    settings?: Record<string, Partial<ChannelNotifyProps>>;
    threadUnreads?: boolean;
    threadMentionCount: number;
}

type BadgeState = {mentions: number; unread: boolean};

// observeTeamBadge implements the two-layer strategy for one team:
//   - Channel part: DB (observeChannelUnreadsAndMentions) once channels exist; blob seed until then.
//   - Thread part: DB (observeUnreadsAndMentions, team-only) once ThreadsSyncStore marks fetched; blob seed until then.
// blob$ is passed from the caller so the System row is queried once for all teams.
// excludeThreadMentions: when true, thread mentions are excluded (used for current server on global threads screen).
const observeTeamBadge = (
    database: Database,
    serverUrl: string,
    teamId: string,
    blob$: Observable<TeamBadgeCounts | undefined>,
    excludeThreadMentions = false,
): Observable<BadgeState> => {
    const hasChannels$ = queryMyChannelsByTeam(database, teamId).observe().pipe(
        map$((ch) => ch.length > 0),
        distinctUntilChanged(),
    );
    const threadsFetched$ = ThreadsSyncStore.observeThreadsFetched(serverUrl, teamId);
    const blobTeam$ = blob$.pipe(map$((b) => b?.teams[teamId]));

    // One query for channel mentions + unread.
    const dbChannel$ = observeChannelUnreadsAndMentions(database, teamId);

    // One query for team thread mentions + unread (no DM threads via {teamId} only).
    const dbThreads$ = observeUnreadsAndMentions(database, {teamId});

    return hasChannels$.pipe(
        combineLatestWith(threadsFetched$, dbChannel$, dbThreads$, blobTeam$),
        map$(([hasChannels, threadsFetched, dbChan, dbThreads, blob]) => {
            const channelMentions = hasChannels ? dbChan.mentions : (blob?.mentionCount ?? 0);
            const channelUnread = hasChannels ? dbChan.unread : (blob?.hasUnreads ?? false);
            let threadMentions = 0;
            let threadUnread = false;
            if (!excludeThreadMentions) {
                threadMentions = threadsFetched ? dbThreads.mentions : (blob?.threadMentionCount ?? 0);
                threadUnread = threadsFetched ? dbThreads.unreads : (blob?.threadHasUnreads ?? false);
            }
            return {
                mentions: channelMentions + threadMentions,
                unread: channelUnread || threadUnread,
            };
        }),
        distinctUntilChanged((a, b) => a.mentions === b.mentions && a.unread === b.unread),
    );
};

// observeDirectBadge implements the two-layer strategy for DM/GM channels (team_id = ''):
//   - Channel part: DB once DM channels exist; blob.direct seed until then.
//   - Thread part: DB (DM-only via observeDirectThreadUnreadsAndMentions) once DM threads are
//     fetched (ThreadsSyncStore key '' signals completion); blob seed until then.
// The channel and thread gates are independent: DM channels are populated by
// deferredAppEntryActions.fetchMyChannelsForTeam, while DM threads are fetched separately.
const observeDirectBadge = (
    database: Database,
    serverUrl: string,
    blob$: Observable<TeamBadgeCounts | undefined>,
    excludeThreadMentions = false,
): Observable<BadgeState> => {
    const currentTeamId = observeCurrentTeamId(database);
    const hasDirectChannels$ = queryMyChannelsByTeam(database, '').observe().pipe(
        map$((ch) => ch.length > 0),
        distinctUntilChanged(),
    );

    // Independent gate for DM/GM thread DB values — mirrors the team thread gate.
    const directThreadsFetched$ = currentTeamId.pipe(switchMap((teamId) => ThreadsSyncStore.observeThreadsFetched(serverUrl, teamId)));
    const blobDirect$ = blob$.pipe(map$((b) => b?.direct));

    // One query for DM/GM channel mentions + unread.
    const dbChannel$ = observeChannelUnreadsAndMentions(database, '');

    // One query for DM/GM-only thread mentions + unread (channel.team_id = '' exclusively).
    const dbThreads$ = observeDirectThreadUnreadsAndMentions(database);

    return hasDirectChannels$.pipe(
        combineLatestWith(directThreadsFetched$, dbChannel$, dbThreads$, blobDirect$),
        map$(([hasDirectChannels, hasFetchedDirectThreads, dbChan, dbThreads, blob]) => {
            const channelMentions = hasDirectChannels ? dbChan.mentions : (blob?.mentionCount ?? 0);
            const channelUnread = hasDirectChannels ? dbChan.unread : (blob?.hasUnreads ?? false);
            let threadMentions = 0;
            let threadUnread = false;
            if (!excludeThreadMentions) {
                threadMentions = hasFetchedDirectThreads ? dbThreads.mentions : (blob?.threadMentionCount ?? 0);
                threadUnread = hasFetchedDirectThreads ? dbThreads.unreads : (blob?.threadHasUnreads ?? false);
            }
            return {
                mentions: channelMentions + threadMentions,
                unread: channelUnread || threadUnread,
            };
        }),
        distinctUntilChanged((a, b) => a.mentions === b.mentions && a.unread === b.unread),
    );
};

// observeUnreadsByServer returns a reactive {mentions, unread} aggregate for an entire server.
// Each team and the DM/GM bucket use the two-layer strategy (blob seed → DB once loaded).
// blob$ is created once and passed down so all teams share a single System row subscription.
// excludeThreadMentions: when true, thread mentions are excluded from the aggregate (used when
// the user is viewing the global threads screen of this server — threads are already visible there).
export const observeUnreadsByServer = (serverUrl: string, excludeThreadMentions = false): Observable<BadgeState> => {
    const server = DatabaseManager.serverDatabases[serverUrl];
    if (!server?.database) {
        return of$({mentions: 0, unread: false});
    }
    const {database} = server;

    const blob$ = observeTeamBadgeCounts(database);
    const direct$ = observeDirectBadge(database, serverUrl, blob$, excludeThreadMentions);

    return queryMyTeams(database).observe().pipe(
        switchMap((teams) => {
            if (!teams.length) {
                return direct$;
            }

            const allBadges$: Array<Observable<BadgeState>> = [
                ...teams.map((t) => observeTeamBadge(database, serverUrl, t.id, blob$, excludeThreadMentions)),
                direct$,
            ];

            const addBadge = (acc$: Observable<BadgeState>, badge$: Observable<BadgeState>) => {
                return acc$.pipe(
                    combineLatestWith(badge$),
                    map$(([acc, badge]) => ({mentions: acc.mentions + badge.mentions, unread: acc.unread || badge.unread})),
                );
            };
            return allBadges$.reduce(addBadge, of$({mentions: 0, unread: false} as BadgeState));
        }),
        distinctUntilChanged((a, b) => a.mentions === b.mentions && a.unread === b.unread),
    );
};

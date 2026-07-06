// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineLatest, type Observable, of as of$} from 'rxjs';
import {distinctUntilChanged, map as map$, switchMap, throttleTime} from 'rxjs/operators';

import DatabaseManager from '@database/manager';
import {observeAllMyChannelsBadgeState, observeAllMyChannelNotifyProps, observeChannelTeamMap} from '@queries/servers/channel';
import {observeCurrentTeamId, observeTeamBadgeCounts} from '@queries/servers/system';
import {queryMyTeams} from '@queries/servers/team';
import {observeAllTeamUnreadThreads, observeDirectThreadUnreadsAndMentions, observeThreadInTeamMap} from '@queries/servers/thread';
import ChannelsSyncStore from '@store/channels_sync_store';
import ThreadsSyncStore from '@store/threads_sync_store';

import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type MyTeamModel from '@typings/database/models/servers/my_team';

export type UnreadObserverArgs = {
    myChannels: MyChannelModel[];
    settings?: Record<string, Partial<ChannelNotifyProps>>;
    threadUnreads?: boolean;
    threadMentionCount: number;
}

type BadgeState = {mentions: number; unread: boolean};
type TeamSyncState = {channelsFetched: boolean; threadsFetched: boolean};

// leading=true passes the first value immediately; trailing=true emits after burst settles.
const THROTTLE_MS = 300;

function observeTeamSyncMap(serverUrl: string, teams: MyTeamModel[], excludeThreadMentions: boolean): Observable<Map<string, TeamSyncState>> {
    if (!teams.length) {
        return of$(new Map());
    }
    return combineLatest(teams.map((t) => {
        const channelsFetched = ChannelsSyncStore.observeChannelsFetched(serverUrl, t.id);
        const threadsFetched = excludeThreadMentions ? of$(false) : ThreadsSyncStore.observeThreadsFetched(serverUrl, t.id);
        return combineLatest([channelsFetched, threadsFetched]).pipe(
            map$(([cf, tf]) => [t.id, {channelsFetched: cf, threadsFetched: tf}] as [string, TeamSyncState]),
        );
    })).pipe(
        map$((entries) => new Map(entries)),
    );
}

export const observeUnreadsByServer = (serverUrl: string, excludeThreadMentions = false): Observable<BadgeState> => {
    const server = DatabaseManager.serverDatabases[serverUrl];
    if (!server?.database) {
        return of$({mentions: 0, unread: false});
    }
    const {database} = server;

    const myTeams = queryMyTeams(database).observe();
    const allChannels = observeAllMyChannelsBadgeState(database);
    const channelTeamMap = observeChannelTeamMap(database);
    const notifyProps = observeAllMyChannelNotifyProps(database);
    const teamThreads = observeAllTeamUnreadThreads(database);
    const threadInTeamMap = observeThreadInTeamMap(database);
    const directThreads = observeDirectThreadUnreadsAndMentions(database);
    const blob = observeTeamBadgeCounts(database);
    const currentTeamId = observeCurrentTeamId(database);

    const teamSyncMap = myTeams.pipe(
        switchMap((teams) => observeTeamSyncMap(serverUrl, teams, excludeThreadMentions)),
    );

    // Direct thread fetch state is keyed by the current team ID (same key DMs use).
    const directThreadsFetched = excludeThreadMentions ? of$(false) : currentTeamId.pipe(
        switchMap((tid) => ThreadsSyncStore.observeThreadsFetched(serverUrl, tid)),
        distinctUntilChanged(),
    );

    return combineLatest([allChannels, channelTeamMap, notifyProps, teamThreads, threadInTeamMap, directThreads, blob, myTeams, teamSyncMap, directThreadsFetched]).pipe(
        throttleTime(THROTTLE_MS, undefined, {leading: true, trailing: true}),
        map$(([channels, teamMap, notify, threads, threadTeamMap, dmThreads, badgeBlob, teams, syncState, isDirectThreadsFetched]) => {
            // Group channel badges by teamId in JS
            const channelMentionsByTeam = new Map<string, number>();
            const channelUnreadByTeam = new Map<string, boolean>();
            for (const ch of channels) {
                const isMuted = notify[ch.id]?.mark_unread === 'mention';
                if (isMuted) {
                    continue;
                }
                const tid = teamMap.get(ch.id) ?? '';
                channelMentionsByTeam.set(tid, (channelMentionsByTeam.get(tid) ?? 0) + ch.mentionsCount);
                if (ch.isUnread) {
                    channelUnreadByTeam.set(tid, true);
                }
            }

            // Group team thread badges by teamId in JS
            const threadMentionsByTeam = new Map<string, number>();
            const threadUnreadByTeam = new Map<string, boolean>();
            if (!excludeThreadMentions) {
                for (const t of threads) {
                    const tid = threadTeamMap.get(t.id) ?? '';
                    if (!tid) {
                        continue;
                    }
                    threadMentionsByTeam.set(tid, (threadMentionsByTeam.get(tid) ?? 0) + t.unreadMentions);
                    if (t.unreadReplies) {
                        threadUnreadByTeam.set(tid, true);
                    }
                }
            }

            let totalMentions = 0;
            let totalUnread = false;

            for (const team of teams) {
                const {id: tid} = team;
                const sync = syncState.get(tid);
                const channelsFetched = sync?.channelsFetched ?? false;
                const threadsFetched = sync?.threadsFetched ?? false;
                const blobTeam = badgeBlob?.teams[tid];

                const channelMentions = channelsFetched ? (channelMentionsByTeam.get(tid) ?? 0) : (blobTeam?.mentionCount ?? 0);
                const channelUnread = channelsFetched ? (channelUnreadByTeam.get(tid) ?? false) : (blobTeam?.hasUnreads ?? false);
                let threadMentions = 0;
                let threadUnread = false;
                if (!excludeThreadMentions) {
                    threadMentions = threadsFetched ? (threadMentionsByTeam.get(tid) ?? 0) : (blobTeam?.threadMentionCount ?? 0);
                    threadUnread = threadsFetched ? (threadUnreadByTeam.get(tid) ?? false) : (blobTeam?.threadHasUnreads ?? false);
                }

                totalMentions += channelMentions + threadMentions;
                totalUnread = totalUnread || channelUnread || threadUnread;
            }

            // Aggregate DM/GM channels (teamId = '')
            const blobDirect = badgeBlob?.direct;
            const directChannelMentions = channelMentionsByTeam.get('') ?? 0;
            const directChannelUnread = channelUnreadByTeam.get('') ?? false;
            const hasDirectChannels = directChannelMentions > 0 || directChannelUnread;

            totalMentions += hasDirectChannels ? directChannelMentions : (blobDirect?.mentionCount ?? 0);
            totalUnread = totalUnread || (hasDirectChannels ? directChannelUnread : (blobDirect?.hasUnreads ?? false));

            // Aggregate DM/GM threads
            if (!excludeThreadMentions) {
                const directThreadMentions = isDirectThreadsFetched ? dmThreads.mentions : (blobDirect?.threadMentionCount ?? 0);
                const directThreadUnread = isDirectThreadsFetched ? dmThreads.unreads : (blobDirect?.threadHasUnreads ?? false);
                totalMentions += directThreadMentions;
                totalUnread = totalUnread || directThreadUnread;
            }

            return {mentions: totalMentions, unread: totalUnread};
        }),
        distinctUntilChanged((a, b) => a.mentions === b.mentions && a.unread === b.unread),
    );
};

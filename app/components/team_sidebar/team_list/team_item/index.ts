// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged, map, combineLatestWith} from 'rxjs/operators';

import {withServerUrl} from '@context/server';
import {observeMyChannelMentionCount, observeMyChannelUnreads, queryMyChannelsByTeam} from '@queries/servers/channel';
import {observeCurrentTeamId, observeTeamBadgeCounts} from '@queries/servers/system';
import {observeTeam} from '@queries/servers/team';
import {observeThreadMentionCount, observeUnreadsAndMentions} from '@queries/servers/thread';
import ThreadsSyncStore from '@store/threads_sync_store';

import TeamItem from './team_item';

import type {WithDatabaseArgs} from '@typings/database/database';
import type MyTeamModel from '@typings/database/models/servers/my_team';

type WithTeamsArgs = WithDatabaseArgs & {
    myTeam: MyTeamModel;
}

const enhance = withObservables(['myTeam', 'serverUrl'], ({myTeam, database, serverUrl}: WithTeamsArgs & {serverUrl: string}) => {
    const teamId = myTeam.id;

    const selected = observeCurrentTeamId(database).pipe(
        switchMap((ctid) => of$(ctid === teamId)),
        distinctUntilChanged(),
    );

    // Gate 1: true once deferredAppEntryActions has fetched this team's channels into DB.
    const hasChannelsInDB = queryMyChannelsByTeam(database, teamId).observe().pipe(
        map((channels) => channels.length > 0),
        distinctUntilChanged(),
    );

    // Gate 2: true once fetchTeamsThreads has run for this team this session.
    const threadsFetched = ThreadsSyncStore.observeThreadsFetched(serverUrl, teamId);

    // Blob seed for when DB rows are not yet available.
    const blobBadge = observeTeamBadgeCounts(database).pipe(
        map((counts) => counts?.teams[teamId]),
        distinctUntilChanged(),
    );

    // Channel-only DB values.
    const dbChannelMentions = observeMyChannelMentionCount(database, teamId);
    const dbChannelUnreads = observeMyChannelUnreads(database, teamId);

    // Thread-only DB values.
    const dbThreadMentions = observeThreadMentionCount(database, {teamId});
    const dbThreadUnreads = observeUnreadsAndMentions(database, {teamId});

    // mentionCount: channel part (gated on channels) + thread part (gated on threads fetched).
    const mentionCount = hasChannelsInDB.pipe(
        combineLatestWith(threadsFetched, dbChannelMentions, dbThreadMentions, blobBadge),
        map(([hasChannels, hasFetchedThreads, dbChanMentions, dbThreadMents, blob]) => {
            const channelPart = hasChannels ? dbChanMentions : (blob?.mentionCount ?? 0);
            const threadPart = hasFetchedThreads ? dbThreadMents : (blob?.threadMentionCount ?? 0);
            return channelPart + threadPart;
        }),
        distinctUntilChanged(),
    );

    // hasUnreads: channel part (gated on channels) OR thread part (gated on threads fetched).
    const hasUnreads = hasChannelsInDB.pipe(
        combineLatestWith(threadsFetched, dbChannelUnreads, dbThreadUnreads, blobBadge),
        map(([hasChannels, hasFetchedThreads, dbChanUnreads, dbThreadUr, blob]) => {
            const channelPart = hasChannels ? dbChanUnreads : (blob?.hasUnreads ?? false);
            const threadPart = hasFetchedThreads ? dbThreadUr.unreads : (blob?.threadHasUnreads ?? false);
            return channelPart || threadPart;
        }),
        distinctUntilChanged(),
    );

    return {
        selected,
        team: observeTeam(database, teamId),
        mentionCount,
        hasUnreads,
    };
});

export default withDatabase(withServerUrl(enhance(TeamItem)));

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators';

import {observeChannelsWithCalls} from '@calls/state';
import {General} from '@constants';
import {withServerUrl} from '@context/server';
import {observeIsMutedSetting, observeMyChannel, queryChannelMembers} from '@queries/servers/channel';
import {queryDraft} from '@queries/servers/drafts';
import {observeCurrentChannelId, observeCurrentUserId} from '@queries/servers/system';
import {observeTeam} from '@queries/servers/team';
import {shareLatest} from '@utils/observable';

import ChannelItem from './channel_item';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';

type EnhanceProps = WithDatabaseArgs & {
    channel: ChannelModel | Channel;
    showTeamName?: boolean;
    serverUrl?: string;
    shouldHighlightActive?: boolean;
    shouldHighlightState?: boolean;
}

const enhance = withObservables(['channel', 'showTeamName', 'shouldHighlightActive', 'shouldHighlightState'], ({
    channel,
    database,
    serverUrl,
    showTeamName = false,
    shouldHighlightActive = false,
    shouldHighlightState = false,
}: EnhanceProps) => {
    const currentUserId = observeCurrentUserId(database);
    const myChannel = observeMyChannel(database, channel.id).pipe(shareLatest());

    const hasDraft = shouldHighlightState ? queryDraft(database, channel.id).observeWithColumns(['message', 'files', 'metadata']).pipe(
        switchMap((drafts) => {
            if (!drafts.length) {
                return of$(false);
            }

            const draft = drafts[0];
            const standardPriority = draft?.metadata?.priority?.priority === '';

            if (!draft.message && !draft.files.length && standardPriority) {
                return of$(false);
            }

            return of$(true);
        }),
        distinctUntilChanged(),
    ) : of$(false);

    const isActive = shouldHighlightActive ?
        observeCurrentChannelId(database).pipe(
            map((id) => (id ? id === channel.id : false)),
            distinctUntilChanged(),
        ) : of$(false);

    const isMuted = shouldHighlightState ?
        myChannel.pipe(
            switchMap((mc) => {
                if (!mc) {
                    return of$(false);
                }
                return observeIsMutedSetting(database, mc.id);
            }),
        ) : of$(false);

    const teamId = 'teamId' in channel ? channel.teamId : channel.team_id;
    const teamDisplayName = (teamId && showTeamName) ?
        observeTeam(database, teamId).pipe(
            map((team) => team?.displayName || ''),
            distinctUntilChanged(),
        ) : of$('');

    const membersCount = channel.type === General.GM_CHANNEL ?
        queryChannelMembers(database, channel.id).observeCount(false) :
        of$(0);

    const isUnread = shouldHighlightState ?
        myChannel.pipe(
            map((mc) => mc?.isUnread),
            distinctUntilChanged(),
        ) : of$(false);

    const mentionsCount = shouldHighlightState ?
        myChannel.pipe(
            map((mc) => mc?.mentionsCount),
            distinctUntilChanged(),
        ) : of$(0);

    const urgentMentionCount = shouldHighlightState ?
        myChannel.pipe(
            map((mc) => mc?.urgentMentionCount),
            distinctUntilChanged(),
        ) : of$(0);

    const hasCall = observeChannelsWithCalls(serverUrl || '').pipe(
        map((calls) => Boolean(calls[channel.id])),
        distinctUntilChanged(),
    );

    return {
        channel: 'observe' in channel ? channel.observe() : of$(channel),
        currentUserId,
        hasDraft,
        isActive,
        isMuted,
        membersCount,
        isUnread,
        mentionsCount,
        urgentMentionCount,
        teamDisplayName,
        hasCall,
    };
});

export default React.memo(withDatabase(withServerUrl(enhance(ChannelItem))));

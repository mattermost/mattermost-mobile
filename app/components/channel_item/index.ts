// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';
import {of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {observeChannelsWithCalls} from '@calls/state';
import {General} from '@constants';
import {withServerUrl} from '@context/server';
import {observeIsMutedSetting, observeMyChannel, queryChannelMembers} from '@queries/servers/channel';
import {queryDraft} from '@queries/servers/drafts';
import {observeCurrentChannelId, observeCurrentUserId} from '@queries/servers/system';
import {observeTeam} from '@queries/servers/team';

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
    const myChannel = observeMyChannel(database, channel.id);

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
            switchMap((id) => of$(id ? id === channel.id : false)),
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
            switchMap((team) => of$(team?.displayName || '')),
            distinctUntilChanged(),
        ) : of$('');

    const membersCount = channel.type === General.GM_CHANNEL ?
        queryChannelMembers(database, channel.id).observeCount(false) :
        of$(0);

    const isUnread = shouldHighlightState ?
        myChannel.pipe(
            switchMap((mc) => of$(mc?.isUnread)),
            distinctUntilChanged(),
        ) : of$(false);

    const mentionsCount = shouldHighlightState ?
        myChannel.pipe(
            switchMap((mc) => of$(mc?.mentionsCount)),
            distinctUntilChanged(),
        ) : of$(0);

    const hasCall = observeChannelsWithCalls(serverUrl || '').pipe(
        switchMap((calls) => of$(Boolean(calls[channel.id]))),
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
        teamDisplayName,
        hasCall,
    };
});

export default React.memo(withDatabase(withServerUrl(enhance(ChannelItem))));

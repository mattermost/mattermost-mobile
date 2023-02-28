// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
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
    highlightActive?: boolean;
    highlightState?: boolean;
}

const enhance = withObservables(['channel', 'showTeamName', 'highlightActive', 'highlightState'], ({
    channel,
    database,
    serverUrl,
    showTeamName = false,
    highlightActive = false,
    highlightState = false,
}: EnhanceProps) => {
    const currentUserId = observeCurrentUserId(database);
    const myChannel = observeMyChannel(database, channel.id);

    const hasDraft = highlightState ?
        queryDraft(database, channel.id).observeWithColumns(['message', 'files']).pipe(
            switchMap((draft) => of$(draft.length > 0)),
            distinctUntilChanged(),
        ) : of$(false);

    const isActive = highlightActive ?
        observeCurrentChannelId(database).pipe(
            switchMap((id) => of$(id ? id === channel.id : false)),
            distinctUntilChanged(),
        ) : of$(false);

    const isMuted = highlightState ?
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

    const isUnread = highlightState ?
        myChannel.pipe(
            switchMap((mc) => of$(mc?.isUnread)),
            distinctUntilChanged(),
        ) : of$(false);

    const mentionsCount = highlightState ?
        myChannel.pipe(
            switchMap((mc) => of$(mc?.mentionsCount)),
            distinctUntilChanged(),
        ) : of$(0);

    const hasMember = myChannel.pipe(
        switchMap((mc) => of$(Boolean(mc))),
        distinctUntilChanged(),
    );

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
        hasMember,
        hasCall,
    };
});

export default React.memo(withDatabase(withServerUrl(enhance(ChannelItem))));

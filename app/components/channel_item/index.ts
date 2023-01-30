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
    channel: ChannelModel;
    showTeamName?: boolean;
    serverUrl?: string;
}

const enhance = withObservables(['channel', 'showTeamName'], ({
    channel,
    database,
    showTeamName,
    serverUrl,
}: EnhanceProps) => {
    const currentUserId = observeCurrentUserId(database);
    const myChannel = observeMyChannel(database, channel.id);

    const hasDraft = queryDraft(database, channel.id).observeWithColumns(['message', 'files']).pipe(
        switchMap((draft) => of$(draft.length > 0)),
        distinctUntilChanged(),
    );

    const isActive = observeCurrentChannelId(database).pipe(
        switchMap((id) => of$(id ? id === channel.id : false)),
        distinctUntilChanged(),
    );

    const isMuted = myChannel.pipe(
        switchMap((mc) => {
            if (!mc) {
                return of$(false);
            }
            return observeIsMutedSetting(database, mc.id);
        }),
    );

    let teamDisplayName = of$('');
    if (channel.teamId && showTeamName) {
        teamDisplayName = observeTeam(database, channel.teamId).pipe(
            switchMap((team) => of$(team?.displayName || '')),
            distinctUntilChanged(),
        );
    }

    let membersCount = of$(0);
    if (channel.type === General.GM_CHANNEL) {
        membersCount = queryChannelMembers(database, channel.id).observeCount(false);
    }

    const isUnread = myChannel.pipe(
        switchMap((mc) => of$(mc?.isUnread)),
        distinctUntilChanged(),
    );

    const mentionsCount = myChannel.pipe(
        switchMap((mc) => of$(mc?.mentionsCount)),
        distinctUntilChanged(),
    );

    const hasMember = myChannel.pipe(
        switchMap((mc) => of$(Boolean(mc))),
        distinctUntilChanged(),
    );

    const hasCall = observeChannelsWithCalls(serverUrl || '').pipe(
        switchMap((calls) => of$(Boolean(calls[channel.id]))),
        distinctUntilChanged(),
    );

    return {
        channel: channel.observe(),
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

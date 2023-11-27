// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import React from 'react';
import {of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {General} from '@constants';
import {withServerUrl} from '@context/server';
import {observeMyChannel, queryChannelMembers} from '@queries/servers/channel';
import {observeCurrentUserId} from '@queries/servers/system';
import {observeTeam} from '@queries/servers/team';

import ChannelItem from './channel_item';

import type ChannelModel from '@typings/database/models/servers/channel';

type Props = {
    channel: ChannelModel;
    showTeamName?: boolean;
    serverUrl?: string;
}

const enhance = withObservables(['channel', 'showTeamName'], ({channel, showTeamName}: Props) => {
    const database = channel.database;
    const currentUserId = observeCurrentUserId(database);
    const myChannel = observeMyChannel(database, channel.id);

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

    const hasMember = myChannel.pipe(
        switchMap((mc) => of$(Boolean(mc))),
        distinctUntilChanged(),
    );

    return {
        channel: channel.observe(),
        currentUserId,
        membersCount,
        teamDisplayName,
        hasMember,
    };
});

export default React.memo(withServerUrl(enhance(ChannelItem)));

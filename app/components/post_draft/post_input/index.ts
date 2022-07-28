// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {observeChannel} from '@queries/servers/channel';
import {observeConfig} from '@queries/servers/system';

import PostInput from './post_input';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';

type OwnProps = {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({database, channelId}: WithDatabaseArgs & OwnProps) => {
    const config = observeConfig(database);
    const timeBetweenUserTypingUpdatesMilliseconds = config.pipe(
        switchMap((cfg) => of$(parseInt(cfg?.TimeBetweenUserTypingUpdatesMilliseconds || '0', 10))),
    );

    const enableUserTypingMessage = config.pipe(
        switchMap((cfg) => of$(cfg?.EnableUserTypingMessages === 'true')),
    );

    const maxNotificationsPerChannel = config.pipe(
        switchMap((cfg) => of$(parseInt(cfg?.MaxNotificationsPerChannel || '0', 10))),
    );

    const channel = observeChannel(database, channelId);

    const channelDisplayName = channel.pipe(
        switchMap((c) => of$(c?.displayName)),
    );

    const membersInChannel = channel.pipe(
        switchMap((c) => (c ? c.info.observe() : of$({memberCount: 0}))),
        switchMap((i: ChannelInfoModel) => of$(i.memberCount)),
        distinctUntilChanged(),
    );

    return {
        timeBetweenUserTypingUpdatesMilliseconds,
        enableUserTypingMessage,
        maxNotificationsPerChannel,
        channelDisplayName,
        membersInChannel,
    };
});

export default React.memo(withDatabase(enhanced(PostInput)));

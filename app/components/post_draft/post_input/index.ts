// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';
import {of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {observeChannel, observeChannelInfo} from '@queries/servers/channel';
import {observeConfigBooleanValue, observeConfigIntValue} from '@queries/servers/system';

import PostInput from './post_input';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';

type OwnProps = {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({database, channelId}: WithDatabaseArgs & OwnProps) => {
    const timeBetweenUserTypingUpdatesMilliseconds = observeConfigIntValue(database, 'TimeBetweenUserTypingUpdatesMilliseconds');
    const enableUserTypingMessage = observeConfigBooleanValue(database, 'EnableUserTypingMessages');
    const maxNotificationsPerChannel = observeConfigIntValue(database, 'MaxNotificationsPerChannel');

    const channel = observeChannel(database, channelId);

    const channelDisplayName = channel.pipe(
        switchMap((c) => of$(c?.displayName)),
    );

    const membersInChannel = channel.pipe(
        switchMap((c) => (c ? observeChannelInfo(database, c.id) : of$({memberCount: 0}))),
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

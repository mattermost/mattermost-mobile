// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeCurrentChannel} from '@app/queries/servers/channel';
import {observeConfig} from '@app/queries/servers/system';
import {MM_TABLES} from '@constants/database';

import PostInput from './post_input';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';

const {SERVER: {CHANNEL}} = MM_TABLES;

type OwnProps = {
    channelId: string;
    rootId?: string;
}

const enhanced = withObservables([], ({database, channelId, rootId}: WithDatabaseArgs & OwnProps) => {
    const config = observeConfig(database);
    const timeBetweenUserTypingUpdatesMilliseconds = config.pipe(
        switchMap((cfg) => of$(parseInt(cfg.TimeBetweenUserTypingUpdatesMilliseconds, 10))),
    );

    const enableUserTypingMessage = config.pipe(
        switchMap((cfg) => of$(cfg.EnableUserTypingMessages === 'true')),
    );

    const maxNotificationsPerChannel = config.pipe(
        switchMap((cfg) => of$(parseInt(cfg.MaxNotificationsPerChannel, 10))),
    );

    let channel;
    if (rootId) {
        channel = database.get<ChannelModel>(CHANNEL).findAndObserve(channelId);
    } else {
        channel = observeCurrentChannel(database);
    }

    const channelDisplayName = channel.pipe(
        switchMap((c) => of$(c.displayName)),
    );

    const channelInfo = channel.pipe(switchMap((c) => c.info.observe()));

    const membersInChannel = channelInfo.pipe(
        switchMap((i: ChannelInfoModel) => of$(i.memberCount)),
    );

    return {
        timeBetweenUserTypingUpdatesMilliseconds,
        enableUserTypingMessage,
        maxNotificationsPerChannel,
        channelDisplayName,
        membersInChannel,
    };
});

export default withDatabase(enhanced(PostInput));

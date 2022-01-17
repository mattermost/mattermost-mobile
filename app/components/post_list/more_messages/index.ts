// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Database} from '@constants';

import MoreMessages from './more_messages';

import type {WithDatabaseArgs} from '@typings/database/database';
import type MyChannelModel from '@typings/database/models/servers/my_channel';

const {MM_TABLES} = Database;
const {SERVER: {MY_CHANNEL}} = MM_TABLES;

const enhanced = withObservables(['channelId'], ({channelId, database}: {channelId: string} & WithDatabaseArgs) => {
    const myChannel = database.get<MyChannelModel>(MY_CHANNEL).findAndObserve(channelId);
    const isManualUnread = myChannel.pipe(switchMap((ch) => of$(ch.manuallyUnread)));
    const unreadCount = myChannel.pipe(switchMap((ch) => of$(ch.messageCount)));

    return {
        isManualUnread,
        unreadCount,
    };
});

export default withDatabase(enhanced(MoreMessages));

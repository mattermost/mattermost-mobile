// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeMyChannel} from '@queries/servers/channel';

import MoreMessages from './more_messages';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables(['channelId'], ({channelId, database}: {channelId: string} & WithDatabaseArgs) => {
    const myChannel = observeMyChannel(database, channelId);
    const isManualUnread = myChannel.pipe(switchMap((ch) => of$(ch?.manuallyUnread)));
    const unreadCount = myChannel.pipe(switchMap((ch) => of$(ch?.messageCount)));

    return {
        isManualUnread,
        unreadCount,
    };
});

export default withDatabase(enhanced(MoreMessages));

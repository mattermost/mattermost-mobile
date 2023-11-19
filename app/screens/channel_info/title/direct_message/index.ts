// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {combineLatestWith, switchMap} from 'rxjs/operators';

import {observeChannel} from '@queries/servers/channel';
import {observeConfigBooleanValue, observeCurrentUserId} from '@queries/servers/system';
import {observeUser} from '@queries/servers/user';
import {getUserIdFromChannelName} from '@utils/user';

import DirectMessage from './direct_message';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    const currentUserId = observeCurrentUserId(database);
    const channel = observeChannel(database, channelId);
    const user = currentUserId.pipe(
        combineLatestWith(channel),
        switchMap(([uId, ch]) => {
            if (!ch) {
                return of$(undefined);
            }
            const otherUserId = getUserIdFromChannelName(uId, ch.name);
            return observeUser(database, otherUserId);
        }),
    );

    return {
        currentUserId,
        user,
        hideGuestTags: observeConfigBooleanValue(database, 'HideGuestTags'),
    };
});

export default withDatabase(enhanced(DirectMessage));

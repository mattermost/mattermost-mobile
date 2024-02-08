// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannel, observeChannelMembers} from '@queries/servers/channel';
import {observeCurrentUserId} from '@queries/servers/system';

import GroupMessage from './group_message';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    const currentUserId = observeCurrentUserId(database);
    const channel = observeChannel(database, channelId);
    const members = channel.pipe(switchMap((c) => (c ? observeChannelMembers(database, channelId) : of$([]))));

    return {
        currentUserId,
        members,
    };
});

export default withDatabase(enhanced(GroupMessage));

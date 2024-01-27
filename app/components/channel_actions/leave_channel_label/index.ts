// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {combineLatestWith, switchMap} from 'rxjs/operators';

import {General} from '@constants';
import {observeChannel} from '@queries/servers/channel';
import {observeCurrentUser} from '@queries/servers/user';

import LeaveChannelLabel from './leave_channel_label';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: OwnProps) => {
    const currentUser = observeCurrentUser(database);
    const channel = observeChannel(database, channelId);
    const canLeave = channel.pipe(
        combineLatestWith(currentUser),
        switchMap(([ch, u]) => {
            const isDefaultChannel = ch?.name === General.DEFAULT_CHANNEL;
            return of$(!isDefaultChannel || (isDefaultChannel && u?.isGuest));
        }),
    );

    const displayName = channel.pipe(
        switchMap((c) => of$(c?.displayName)),
    );
    const type = channel.pipe(
        switchMap((c) => of$(c?.type)),
    );

    return {
        canLeave,
        displayName,
        type,
    };
});

export default withDatabase(enhanced(LeaveChannelLabel));

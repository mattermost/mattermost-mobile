// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Channel} from '@constants';
import {observeChannel, observeChannelSettings} from '@queries/servers/channel';

import AutoFollowThreads from './auto_follow_threads';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    const channel = observeChannel(database, channelId);
    const settings = observeChannelSettings(database, channelId);
    const followedStatus = settings.pipe(
        switchMap((s) => {
            return of$(s?.notifyProps?.channel_auto_follow_threads === Channel.CHANNEL_AUTO_FOLLOW_THREADS_TRUE);
        }),
    );

    return {
        followedStatus,
        displayName: channel.pipe(switchMap((c) => of$(c?.displayName))),
    };
});

export default withDatabase(enhanced(AutoFollowThreads));

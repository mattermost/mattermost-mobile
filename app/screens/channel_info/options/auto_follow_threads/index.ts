// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {

    // combineLatestWith,
    switchMap,
} from 'rxjs/operators';

import {Channel} from '@constants';
import {observeChannelSettings} from '@queries/servers/channel';

// import {observeCurrentUser} from '@queries/servers/user';

import AutoFollowThreads from './auto_follow_threads';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

// const isChannelMentionsIgnored = (channelNotifyProps?: Partial<ChannelNotifyProps>, userNotifyProps?: UserNotifyProps | null) => {
//     let autoFollowThreadsDefault = Channel.IGNORE_CHANNEL_MENTIONS_OFF;

//     if (userNotifyProps?.channel && userNotifyProps.channel === 'false') {
//         autoFollowThreadsDefault = Channel.IGNORE_CHANNEL_MENTIONS_ON;
//     }

//     let ignoreChannelMentions = channelNotifyProps?.ignore_channel_mentions;
//     if (!ignoreChannelMentions || ignoreChannelMentions === Channel.IGNORE_CHANNEL_MENTIONS_DEFAULT) {
//         ignoreChannelMentions = autoFollowThreadsDefault as any;
//     }

//     return ignoreChannelMentions !== Channel.IGNORE_CHANNEL_MENTIONS_OFF;
// };

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    // const currentUser = observeCurrentUser(database);
    const settings = observeChannelSettings(database, channelId);
    const followedStatus = settings.pipe(
        switchMap((s) => {
            console.log(s?.notifyProps);
            return of$(s?.notifyProps?.channel_auto_follow_threads === Channel.CHANNEL_AUTO_FOLLOW_THREADS_TRUE);
        }),
    );

    return {
        followedStatus,
    };
});

export default withDatabase(enhanced(AutoFollowThreads));

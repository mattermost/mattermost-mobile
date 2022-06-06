// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {combineLatestWith, switchMap} from 'rxjs/operators';

import {Channel} from '@constants';
import {observeChannelSettings} from '@queries/servers/channel';
import {observeCurrentUser} from '@queries/servers/user';

import IgnoreMentions from './ignore_mentions';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const isChannelMentionsIgnored = (channelNotifyProps?: Partial<ChannelNotifyProps>, userNotifyProps?: UserNotifyProps | null) => {
    let ignoreChannelMentionsDefault = Channel.IGNORE_CHANNEL_MENTIONS_OFF;

    if (userNotifyProps?.channel && userNotifyProps.channel === 'false') {
        ignoreChannelMentionsDefault = Channel.IGNORE_CHANNEL_MENTIONS_ON;
    }

    let ignoreChannelMentions = channelNotifyProps?.ignore_channel_mentions;
    if (!ignoreChannelMentions || ignoreChannelMentions === Channel.IGNORE_CHANNEL_MENTIONS_DEFAULT) {
        ignoreChannelMentions = ignoreChannelMentionsDefault as any;
    }

    return ignoreChannelMentions !== Channel.IGNORE_CHANNEL_MENTIONS_OFF;
};

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    const currentUser = observeCurrentUser(database);
    const settings = observeChannelSettings(database, channelId);
    const ignoring = currentUser.pipe(
        combineLatestWith(settings),
        switchMap(([u, s]) => of$(isChannelMentionsIgnored(s?.notifyProps, u?.notifyProps))),
    );

    return {
        ignoring,
    };
});

export default withDatabase(enhanced(IgnoreMentions));

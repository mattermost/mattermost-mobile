// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General} from '@constants';
import {observeUser} from '@queries/servers/user';

import ChannelMentionItem from './channel_mention_item';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type UserModel from '@typings/database/models/servers/user';

type OwnProps = {
    channel: Channel | ChannelModel;
}

const enhanced = withObservables([], ({database, channel}: WithDatabaseArgs & OwnProps) => {
    let user = of$<UserModel | undefined>(undefined);
    const teammateId = 'teammate_id' in channel ? channel.teammate_id : '';
    const channelDisplayName = 'display_name' in channel ? channel.display_name : channel.displayName;
    if (channel.type === General.DM_CHANNEL && teammateId) {
        user = observeUser(database, teammateId!);
    }

    const isBot = user.pipe(switchMap((u) => of$(u ? u.isBot : false)));
    const isGuest = user.pipe(switchMap((u) => of$(u ? u.isGuest : false)));
    const displayName = user.pipe(switchMap((u) => of$(u ? u.username : channelDisplayName)));

    return {
        isBot,
        isGuest,
        displayName,
    };
});

export default withDatabase(enhanced(ChannelMentionItem));

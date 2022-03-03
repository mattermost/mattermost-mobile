// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General} from '@constants';
import {MM_TABLES} from '@constants/database';

import ChannelMentionItem from './channel_mention_item';

import type {WithDatabaseArgs} from '@typings/database/database';
import type UserModel from '@typings/database/models/servers/user';

type OwnProps = {
    channel: Channel;
}

const {SERVER: {USER}} = MM_TABLES;
const enhanced = withObservables([], ({database, channel}: WithDatabaseArgs & OwnProps) => {
    let user = of$<UserModel | undefined>(undefined);
    if (channel.type === General.DM_CHANNEL) {
        user = database.get<UserModel>(USER).findAndObserve(channel.teammate_id!);
    }

    const isBot = user.pipe(switchMap((u) => of$(u ? u.isBot : false)));
    const isGuest = user.pipe(switchMap((u) => of$(u ? u.isGuest : false)));
    const displayName = user.pipe(switchMap((u) => of$(u ? u.username : channel.display_name)));

    return {
        isBot,
        isGuest,
        displayName,
    };
});

export default withDatabase(enhanced(ChannelMentionItem));

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General} from '@constants';
import {observeChannelMembers} from '@queries/servers/channel';
import {observeCurrentUserId} from '@queries/servers/system';
import {observeUser} from '@queries/servers/user';
import {getUserIdFromChannelName} from '@utils/user';

import DirectChannel from './direct_channel';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type UserModel from '@typings/database/models/servers/user';

const observeIsBot = (user: UserModel | undefined) => of$(Boolean(user?.isBot));

const enhanced = withObservables([], ({channel, database}: {channel: ChannelModel} & WithDatabaseArgs) => {
    const currentUserId = observeCurrentUserId(database);
    const members = observeChannelMembers(database, channel.id);
    let isBot = of$(false);

    if (channel.type === General.DM_CHANNEL) {
        isBot = currentUserId.pipe(
            switchMap((userId: string) => {
                const otherUserId = getUserIdFromChannelName(userId, channel.name);
                return observeUser(database, otherUserId).pipe(
                    switchMap(observeIsBot),
                );
            }),
        );
    }

    return {
        currentUserId,
        isBot,
        members,
    };
});

export default withDatabase(enhanced(DirectChannel));

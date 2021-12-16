// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {catchError, switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@app/constants/database';
import {General} from '@constants';
import {getUserIdFromChannelName} from '@utils/user';

import DirectChannel from './direct_channel';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

const enhanced = withObservables([], ({channel, database}: {channel: ChannelModel} & WithDatabaseArgs) => {
    const currentUserId = database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(switchMap(({value}) => of$(value)));
    const members = channel.members.observe();
    let isBot = of$(false);

    if (channel.type === General.DM_CHANNEL) {
        isBot = currentUserId.pipe(
            switchMap((userId: string) => {
                const otherUserId = getUserIdFromChannelName(userId, channel.name);
                return database.get<UserModel>(MM_TABLES.SERVER.USER).findAndObserve(otherUserId).pipe(
                    // eslint-disable-next-line max-nested-callbacks
                    switchMap((user) => of$(user.isBot)), // eslint-disable-next-line max-nested-callbacks
                    catchError(() => of$(false)),
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

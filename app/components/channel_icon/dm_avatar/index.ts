// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {getUserIdFromChannelName} from '@utils/user';

import DmAvatar from './dm_avatar';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {USER, SYSTEM}} = MM_TABLES;
const {CURRENT_USER_ID} = SYSTEM_IDENTIFIERS;

const enhance = withObservables(['channelName'], ({channelName, database}: {channelName: string} & WithDatabaseArgs) => {
    const currentUserId = database.get<SystemModel>(SYSTEM).findAndObserve(CURRENT_USER_ID).pipe(
        switchMap(({value}) => of$(value)),
    );

    const authorId = currentUserId.pipe(
        switchMap((userId) => of$(getUserIdFromChannelName(userId, channelName))),
    );

    const author = authorId.pipe(
        switchMap((id) => {
            return database.get<UserModel>(USER).query(Q.where('id', id)).observe().pipe(
                // eslint-disable-next-line max-nested-callbacks
                switchMap((users) => (users[0] ? of$(users[0]) : of$(undefined))),
            );
        }),
    );

    return {
        author,
    };
});

export default withDatabase(enhance(DmAvatar));

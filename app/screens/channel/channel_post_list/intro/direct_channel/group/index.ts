// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {MM_TABLES} from '@constants/database';

import Group from './group';

import type {WithDatabaseArgs} from '@typings/database/database';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {USER}} = MM_TABLES;

const enhanced = withObservables([], ({userIds, database}: {userIds: string[]} & WithDatabaseArgs) => ({
    users: database.get<UserModel>(USER).query(Q.where('id', Q.oneOf(userIds))).observeWithColumns(['last_picture_update']),
}));

export default withDatabase(enhanced(Group));

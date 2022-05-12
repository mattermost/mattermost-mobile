// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';

import {observeCurrentUserId} from '@queries/servers/system';
import {observeTeammateNameDisplay} from '@queries/servers/user';

import UserItem from './user_item';

import type {WithDatabaseArgs} from '@typings/database/database';
import type UserModel from '@typings/database/models/servers/user';

type EnhanceProps = WithDatabaseArgs & {
    user: UserModel;
}

const enhance = withObservables(['user'], ({database, user}: EnhanceProps) => ({
    currentUserId: observeCurrentUserId(database),
    teammateDisplayNameSetting: observeTeammateNameDisplay(database),
    user: user.observe(),
}));

export default React.memo(withDatabase(enhance(UserItem)));

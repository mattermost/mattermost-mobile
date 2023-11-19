// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {queryUsersById} from '@queries/servers/user';

import UsersList from './users_list';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    userIds: string[];
};

const enhanced = withObservables(['userIds'], ({database, userIds}: Props) => {
    return {
        users: queryUsersById(database, userIds).observe(),
    };
});

export default withDatabase(enhanced(UsersList));

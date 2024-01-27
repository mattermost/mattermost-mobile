// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryUsersById} from '@queries/servers/user';

import ManageMembersLabel from './manage_members_label';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = WithDatabaseArgs & {
    isDefaultChannel: boolean;
    userId: string;
}

const enhanced = withObservables(['isDefaultChannel', 'userId'], ({isDefaultChannel, userId, database}: OwnProps) => {
    const users = queryUsersById(database, [userId]).observe();
    const canRemoveUser = users.pipe(
        switchMap((u) => {
            return of$(!isDefaultChannel || (isDefaultChannel && u[0].isGuest));
        }),
    );

    return {
        canRemoveUser,
    };
});

export default withDatabase(enhanced(ManageMembersLabel));

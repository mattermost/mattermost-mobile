// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {combineLatestWith, switchMap} from 'rxjs/operators';

import {General} from '@constants';
import {observeChannel} from '@queries/servers/channel';
import {queryUsersById} from '@queries/servers/user';

import ManageMembersLabel from './manage_members_label';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = WithDatabaseArgs & {
    channelId: string;
    userId: string;
}

const enhanced = withObservables(['channelId', 'userId'], ({channelId, userId, database}: OwnProps) => {
    const users = queryUsersById(database, [userId]).fetch();

    const channel = observeChannel(database, channelId);
    const canRemoveUser = channel.pipe(
        combineLatestWith(users),
        switchMap(([ch, u]) => {
            const isDefaultChannel = ch?.name === General.DEFAULT_CHANNEL;
            return of$(!isDefaultChannel || (isDefaultChannel && u[0].isGuest));
        }),
    );

    return {
        canRemoveUser,
    };
});

export default withDatabase(enhanced(ManageMembersLabel));

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeCurrentUserId} from '@queries/servers/system';
import {observeUser} from '@queries/servers/user';
import {getUserIdFromChannelName} from '@utils/user';

import Avatar from './avatar';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables(['channelName', 'database'], ({channelName, database}: {channelName: string} & WithDatabaseArgs) => {
    const currentUserId = observeCurrentUserId(database);

    const authorId = currentUserId.pipe(
        switchMap((userId) => of$(getUserIdFromChannelName(userId, channelName))),
    );

    const author = authorId.pipe(
        switchMap((id) => {
            return observeUser(database, id);
        }),
    );

    return {
        author,
    };
});

export default enhance(Avatar);

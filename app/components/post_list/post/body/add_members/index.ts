// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannel} from '@queries/servers/channel';
import {observeCurrentUser} from '@queries/servers/user';

import AddMembers from './add_members';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

const enhance = withObservables(['post'], ({database, post}: WithDatabaseArgs & {post: PostModel}) => ({
    currentUser: observeCurrentUser(database),
    channelType: observeChannel(database, post.channelId).pipe(
        switchMap(
            (channel) => (channel ? of$(channel.type) : of$(null)),
        ),
    ),
}));

export default withDatabase(enhance(AddMembers));

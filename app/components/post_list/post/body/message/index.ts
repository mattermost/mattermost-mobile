// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {from as from$} from 'rxjs';

import {queryGroupForPosts} from '@helpers/database/groups';
import {observeCurrentUser} from '@queries/servers/user';

import Message from './message';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

type MessageInputArgs = {
    post: PostModel;
}

const withMessageInput = withObservables(['post'], ({database, post}: WithDatabaseArgs & MessageInputArgs) => {
    const currentUser = observeCurrentUser(database);
    const groupsForPosts = from$(queryGroupForPosts(post));

    return {
        currentUser,
        groupsForPosts,
    };
});

export default withDatabase(withMessageInput(Message));

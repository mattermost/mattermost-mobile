// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {from as from$} from 'rxjs';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {queryGroupForPosts} from '@helpers/database/groups';

import Message from './message';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';
import type SystemModel from '@typings/database/models/servers/system';

const {SERVER: {GROUP, SYSTEM, USER}} = MM_TABLES;

const withPreferences = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUserId: database.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID),
    groups: database.get(GROUP).query(Q.where('delete_at', Q.eq(0))).observe(), // Needed for when a group is added or removed
}));

type MessageInputArgs = {
    currentUserId: SystemModel;
    post: PostModel;
}

const withMessageInput = withObservables(
    ['currentUserId', 'post'],
    ({database, currentUserId, post}: WithDatabaseArgs & MessageInputArgs) => {
        const currentUser = database.get(USER).findAndObserve(currentUserId.value);
        const groupsForPosts = from$(queryGroupForPosts(post));

        return {
            currentUser,
            groupsForPosts,
        };
    });

export default withDatabase(withPreferences(withMessageInput(Message)));

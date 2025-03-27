// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Permissions} from '@constants';
import {observeChannel, observeIsReadOnlyChannel} from '@queries/servers/channel';
import {observeReactionsForPost} from '@queries/servers/reaction';
import {observePermissionForPost} from '@queries/servers/role';
import {observeCurrentUserId} from '@queries/servers/system';
import {observeUser} from '@queries/servers/user';

import Reactions from './reactions';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

type WithReactionsInput = WithDatabaseArgs & {
    post: PostModel;
}

const withReactions = withObservables(['post'], ({database, post}: WithReactionsInput) => {
    const currentUserId = observeCurrentUserId(database);
    const currentUser = currentUserId.pipe(
        switchMap((id) => observeUser(database, id)),
    );
    const channel = observeChannel(database, post.channelId);
    const disabled = combineLatest([channel]).pipe(
        switchMap(([c]) => {
            if (c && c.deleteAt > 0) {
                return of$(true);
            }
            return observeIsReadOnlyChannel(database, post.channelId);
        }),
    );

    const canAddReaction = currentUser.pipe(switchMap((u) => observePermissionForPost(database, post, u, Permissions.ADD_REACTION, true)));
    const canRemoveReaction = currentUser.pipe(switchMap((u) => observePermissionForPost(database, post, u, Permissions.REMOVE_REACTION, true)));

    return {
        canAddReaction,
        canRemoveReaction,
        currentUserId,
        disabled,
        postId: of$(post.id),
        reactions: observeReactionsForPost(database, post.id),
    };
});

export default withDatabase(withReactions(Reactions));

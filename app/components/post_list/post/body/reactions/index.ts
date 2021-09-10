// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {from as from$, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General, Permissions} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {hasPermissionForPost} from '@utils/role';
import {isSystemAdmin} from '@utils/user';

import Reactions from './reactions';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

type WithReactionsInput = WithDatabaseArgs & {
    experimentalTownSquareIsReadOnly: boolean;
    post: PostModel;
    currentUser: UserModel;
}

const withSystem = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUser: database.get(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap((currentUserId: SystemModel) =>
            database.get(MM_TABLES.SERVER.USER).findAndObserve(currentUserId.value),
        ),
    ),
    experimentalTownSquareIsReadOnly: database.get(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
        switchMap((cfg: SystemModel) => of$(cfg.value.ExperimentalTownSquareIsReadOnly === 'true')),
    ),
}));

const withReactions = withObservables(['experimentalTownSquareIsReadOnly', 'post', 'currentUser'], ({experimentalTownSquareIsReadOnly, post, currentUser}: WithReactionsInput) => {
    const disabled = post.channel.observe().pipe(
        switchMap((channel: ChannelModel) => {
            return of$(channel.deleteAt > 0 ||
                (channel?.name === General.DEFAULT_CHANNEL && !isSystemAdmin(currentUser.roles) && experimentalTownSquareIsReadOnly));
        }),
    );

    return {
        canAddReaction: from$(hasPermissionForPost(post, currentUser, Permissions.ADD_REACTION, true)),
        canRemoveReaction: from$(hasPermissionForPost(post, currentUser, Permissions.REMOVE_REACTION, true)),
        currentUserId: of$(currentUser.id),
        disabled,
        postId: of$(post.id),
        reactions: post.reactions.observe(),
    };
});

export default withDatabase(withSystem(withReactions(Reactions)));

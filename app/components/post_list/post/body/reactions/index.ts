// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, from as from$, of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {General, Permissions} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {hasPermissionForPost} from '@utils/role';
import {isSystemAdmin} from '@utils/user';

import Reactions from './reactions';

import type {Relation} from '@nozbe/watermelondb';
import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

type WithReactionsInput = WithDatabaseArgs & {
    post: PostModel;
}

const withReactions = withObservables(['post'], ({database, post}: WithReactionsInput) => {
    const currentUserId = database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        map(({value}: {value: string}) => value),
    );
    const currentUser = currentUserId.pipe(
        switchMap((id) => database.get<UserModel>(MM_TABLES.SERVER.USER).findAndObserve(id)),
    );
    const channel = (post.channel as Relation<ChannelModel>).observe();
    const experimentalTownSquareIsReadOnly = database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
        map(({value}: {value: ClientConfig}) => value.ExperimentalTownSquareIsReadOnly === 'true'),
    );
    const disabled = combineLatest([currentUser, channel, experimentalTownSquareIsReadOnly]).pipe(
        map(([u, c, readOnly]) => ((c && c.deleteAt > 0) || (c?.name === General.DEFAULT_CHANNEL && !isSystemAdmin(u.roles) && readOnly))),
    );

    const canAddReaction = currentUser.pipe(switchMap((u) => from$(hasPermissionForPost(post, u, Permissions.ADD_REACTION, true))));
    const canRemoveReaction = currentUser.pipe(switchMap((u) => from$(hasPermissionForPost(post, u, Permissions.REMOVE_REACTION, true))));

    return {
        canAddReaction,
        canRemoveReaction,
        currentUserId,
        disabled,
        postId: of$(post.id),
        reactions: post.reactions.observe(),
    };
});

export default withDatabase(withReactions(Reactions));

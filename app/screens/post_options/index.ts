// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm from '@mattermost/react-native-emm';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$, from as from$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General, Permissions, WebsocketEvents} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {THREAD} from '@constants/screens';
import {isSystemMessage} from '@utils/post';
import {hasPermissionForChannel, hasPermissionForPost} from '@utils/role';
import {isSystemAdmin} from '@utils/user';

import PostOptions from './post_options';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

const {SYSTEM, USER} = MM_TABLES.SERVER;

const enhanced = withObservables(['post'], ({database, post, location, showAddReaction}: WithDatabaseArgs & { post: PostModel; location: string; showAddReaction: boolean }) => {
    const currentUserId = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(switchMap(({value}: { value: string }) => value));
    const currentUser = currentUserId.pipe(switchMap((id) => database.get<UserModel>(USER).findAndObserve(id)));
    const channel = post.channel.observe();
    const channelDeleteAt = post.channel.observe().pipe(switchMap((c: ChannelModel) => of$(c.deleteAt)));

    const config = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(switchMap(({value}: { value: ClientConfig}) => {
        return of$({
            allowEditPost: value.AllowEditPost,
            postEditTimeLimit: value.PostEditTimeLimit,
        });
    }));

    const isLicensed = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.LICENSE).pipe(switchMap(({value}) => of$(value.IsLicensed === 'true')));

    const experimentalTownSquareIsReadOnly = database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).
        findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).
        pipe(switchMap(({value}: { value: ClientConfig }) => of$(value.ExperimentalTownSquareIsReadOnly === 'true')));

    const channelIsReadOnly = combineLatest([currentUser, post.channel, experimentalTownSquareIsReadOnly]).pipe(
        switchMap(([u, c, readOnly]) => of$(c?.name === General.DEFAULT_CHANNEL && !isSystemAdmin(u.roles) && readOnly)),
    );

    const canPost = combineLatest([post.channel, currentUser]).pipe(switchMap(([c, u]) => from$(hasPermissionForChannel(c, u, Permissions.CREATE_POST, false))));

    let canAddReaction = currentUser.pipe(switchMap((u) => from$(hasPermissionForPost(post, u, Permissions.ADD_REACTION, true))));

    const isOwner = currentUserId === of$(post.userId);
    const permission = isOwner ? Permissions.DELETE_POST : Permissions.DELETE_OTHERS_POSTS;
    let canDelete = combineLatest([post, currentUser]).pipe(switchMap(([ps, u]) => from$(hasPermissionForPost(ps, u, permission, false))));

    const isSystemPost = isSystemMessage(post);
    const channelIsArchived = channelDeleteAt !== of$(0);
    const managedConfig = Emm.getManagedConfig();

    let canMarkAsUnread = of$(true);
    let canReply = of$(true);
    let canCopyPermalink = of$(true);
    let canCopyText = of$(false);
    let canEdit = of$(false);
    let canEditUntil = -1;
    let canFlag = of$(true);
    let canPin = of$(true);

    if (location === THREAD) {
        canReply = of$(false);
    }

    if (channelIsArchived || channelIsReadOnly) {
        canAddReaction = of$(false);
        canReply = of$(false);
        canDelete = of$(false);
        canPin = of$(false);
    } else {
        const editPermission = isOwner ? [Permissions.EDIT_POST] : [Permissions.EDIT_POST, Permissions.EDIT_OTHERS_POSTS];

        // canEdit = combineLatest([post, currentUser]).pipe(switchMap(([ps, u]) => from$(hasPermissionForPost(ps, u, editPermission, false))));

        canEdit = canEditPost(state, config, license, currentTeamId, channel, currentUserId, post);

        if (
            canEdit &&
            isLicensed &&
                (
                    (config.allowEditPost === Permissions.ALLOW_EDIT_POST_TIME_LIMIT ||

                    // !isMinimumServerVersion(serverVersion, 6)) ||
                    (config.postEditTimeLimit !== -1 && config.postEditTimeLimit !== '-1')
                    )
                )
        ) {
            canEditUntil = post.createAt + (config.postEditTimeLimit * 1000);
        }
    }

    if (!canPost) {
        canReply = of$(false);
    }

    if (isSystemPost) {
        canAddReaction = of$(false);
        canReply = of$(false);
        canCopyPermalink = of$(false);
        canEdit = of$(false);
        canPin = of$(false);
        canFlag = of$(false);
    }
    if (
        post.deleteAt !== 0 ||
            post?.state === WebsocketEvents.POST_DELETED
    ) {
        canDelete = of$(false);
    }

    if (!showAddReaction) {
        canAddReaction = of$(false);
    }

    if (
        !isSystemPost &&
            managedConfig?.copyAndPasteProtection !== 'true' &&
            post.message
    ) {
        canCopyText = of$(true);
    }

    if (channelIsArchived) {
        canMarkAsUnread = of$(false);
    }

    return {
        canAddReaction,
        canCopyPermalink,
        canCopyText,
        currentUser,
        canReply,
        canPin,
        canFlag,
        canDelete,
        canEdit,
        canMarkAsUnread,
        canEditUntil,
    };
},
);

export default withDatabase(enhanced(PostOptions));

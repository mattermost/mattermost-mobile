// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$, Observable} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Permissions, Post, Screens} from '@constants';
import {AppBindingLocations} from '@constants/apps';
import {MAX_ALLOWED_REACTIONS} from '@constants/emoji';
import AppsManager from '@managers/apps_manager';
import {observeChannel, observeIsReadOnlyChannel} from '@queries/servers/channel';
import {observePost, observePostSaved} from '@queries/servers/post';
import {observeReactionsForPost} from '@queries/servers/reaction';
import {observePermissionForChannel, observePermissionForPost} from '@queries/servers/role';
import {observeConfigIntValue, observeConfigValue, observeLicense} from '@queries/servers/system';
import {observeIsCRTEnabled, observeThreadById} from '@queries/servers/thread';
import {observeCurrentUser} from '@queries/servers/user';
import {toMilliseconds} from '@utils/datetime';
import {isMinimumServerVersion} from '@utils/helpers';
import {isFromWebhook, isSystemMessage} from '@utils/post';
import {getPostIdsForCombinedUserActivityPost} from '@utils/post_list';

import PostOptions from './post_options';

import type {Database} from '@nozbe/watermelondb';
import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type ReactionModel from '@typings/database/models/servers/reaction';
import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

type EnhancedProps = WithDatabaseArgs & {
    combinedPost?: Post | PostModel;
    post: PostModel;
    showAddReaction: boolean;
    sourceScreen: AvailableScreens;
    serverUrl: string;
}

const observeCanEditPost = (database: Database, isOwner: boolean, post: PostModel, postEditTimeLimit: number, isLicensed: boolean, channel: ChannelModel, user: UserModel) => {
    if (!post || isSystemMessage(post)) {
        return of$(false);
    }

    if (isLicensed && postEditTimeLimit !== -1) {
        const timeLeft = (post.createAt + toMilliseconds({seconds: postEditTimeLimit})) - Date.now();
        if (timeLeft <= 0) {
            return of$(false);
        }
    }

    return observePermissionForChannel(database, channel, user, Permissions.EDIT_POST, false).pipe(switchMap((v) => {
        if (!v || isOwner) {
            return of$(v);
        }
        return observePermissionForChannel(database, channel, user, Permissions.EDIT_OTHERS_POSTS, false);
    }));
};

const withPost = withObservables([], ({post, database}: {post: Post | PostModel} & WithDatabaseArgs) => {
    let id: string | undefined;
    let combinedPost: Observable<Post | PostModel | undefined> = of$(undefined);
    if (post?.type === Post.POST_TYPES.COMBINED_USER_ACTIVITY && post.props?.system_post_ids) {
        const systemPostIds = getPostIdsForCombinedUserActivityPost(post.id);
        id = systemPostIds?.pop();
        combinedPost = of$(post);
    }
    const thePost = id ? observePost(database, id) : post;
    return {
        combinedPost,
        post: thePost,
    };
});

const enhanced = withObservables([], ({combinedPost, post, showAddReaction, sourceScreen, database, serverUrl}: EnhancedProps) => {
    const channel = observeChannel(database, post.channelId);
    const channelIsArchived = channel.pipe(switchMap((ch: ChannelModel) => of$(ch.deleteAt !== 0)));
    const currentUser = observeCurrentUser(database);
    const isLicensed = observeLicense(database).pipe(switchMap((lcs) => of$(lcs?.IsLicensed === 'true')));
    const allowEditPost = observeConfigValue(database, 'AllowEditPost');
    const serverVersion = observeConfigValue(database, 'Version');
    const postEditTimeLimit = observeConfigIntValue(database, 'PostEditTimeLimit', -1);
    const bindings = AppsManager.observeBindings(serverUrl, AppBindingLocations.POST_MENU_ITEM);

    const canPostPermission = combineLatest([channel, currentUser]).pipe(switchMap(([c, u]) => observePermissionForChannel(database, c, u, Permissions.CREATE_POST, false)));
    const hasAddReactionPermission = currentUser.pipe(switchMap((u) => observePermissionForPost(database, post, u, Permissions.ADD_REACTION, true)));
    const canDeletePostPermission = currentUser.pipe(switchMap((u) => {
        const isOwner = post.userId === u?.id;
        return observePermissionForPost(database, post, u, isOwner ? Permissions.DELETE_POST : Permissions.DELETE_OTHERS_POSTS, false);
    }));

    const channelIsReadOnly = observeIsReadOnlyChannel(database, post.channelId);

    const isUnderMaxAllowedReactions = observeReactionsForPost(database, post.id).pipe(
        // eslint-disable-next-line max-nested-callbacks
        switchMap((reactions: ReactionModel[]) => of$(new Set(reactions.map((r) => r.emojiName)).size < MAX_ALLOWED_REACTIONS)),
    );

    const canEditUntil = combineLatest([isLicensed, allowEditPost, postEditTimeLimit, serverVersion, channelIsArchived, channelIsReadOnly]).pipe(
        switchMap(([ls, alw, limit, semVer, isArchived, isReadOnly]) => {
            if (!isArchived && !isReadOnly && ls && ((alw === Permissions.ALLOW_EDIT_POST_TIME_LIMIT && !isMinimumServerVersion(semVer || '', 6)) || (limit !== -1))) {
                return of$(post.createAt + (limit * (1000)));
            }
            return of$(-1);
        }),
    );

    const canReply = combineLatest([channelIsArchived, channelIsReadOnly, canPostPermission]).pipe(switchMap(([isArchived, isReadOnly, canPost]) => {
        return of$(!isArchived && !isReadOnly && sourceScreen !== Screens.THREAD && !isSystemMessage(post) && canPost);
    }));

    const canPin = combineLatest([channelIsArchived, channelIsReadOnly]).pipe(switchMap(([isArchived, isReadOnly]) => {
        return of$(!isSystemMessage(post) && !isArchived && !isReadOnly);
    }));

    const isSaved = observePostSaved(database, post.id);

    const canEdit = combineLatest([postEditTimeLimit, isLicensed, channel, currentUser, channelIsArchived, channelIsReadOnly, canEditUntil, canPostPermission]).pipe(
        switchMap(([lt, ls, c, u, isArchived, isReadOnly, until, canPost]) => {
            const isOwner = u?.id === post.userId;
            const canEditPostPermission = (c && u) ? observeCanEditPost(database, isOwner, post, lt, ls, c, u) : of$(false);
            const timeNotReached = (until === -1) || (until > Date.now());
            return canEditPostPermission.pipe(
                // eslint-disable-next-line max-nested-callbacks
                switchMap((canEditPost) => of$(canEditPost && !isArchived && !isReadOnly && timeNotReached && canPost)),
            );
        }),
    );

    const canMarkAsUnread = combineLatest([currentUser, channelIsArchived]).pipe(
        switchMap(([user, isArchived]) => of$(
            !isArchived && (
                (user?.id !== post.userId && !isSystemMessage(post)) || isFromWebhook(post)
            ),
        )),
    );

    const canAddReaction = combineLatest([hasAddReactionPermission, channelIsReadOnly, isUnderMaxAllowedReactions, channelIsArchived]).pipe(
        switchMap(([permission, readOnly, maxAllowed, isArchived]) => {
            return of$(!isSystemMessage(post) && permission && !readOnly && !isArchived && maxAllowed && showAddReaction);
        }),
    );

    const canDelete = combineLatest([canDeletePostPermission, channelIsArchived, channelIsReadOnly, canPostPermission]).pipe(switchMap(([permission, isArchived, isReadOnly, canPost]) => {
        return of$(permission && !isArchived && !isReadOnly && canPost);
    }));

    const thread = observeIsCRTEnabled(database).pipe(
        switchMap((enabled) => (enabled ? observeThreadById(database, post.id) : of$(undefined))),
    );

    return {
        canMarkAsUnread,
        canAddReaction,
        canDelete,
        canReply,
        canPin,
        combinedPost: of$(combinedPost),
        isSaved,
        canEdit,
        post,
        thread,
        bindings,
    };
});

export default withDatabase(withPost(enhanced(PostOptions)));

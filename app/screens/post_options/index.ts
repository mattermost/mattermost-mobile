// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, from as from$, of as of$, Observable} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General, Permissions, Post, Preferences, Screens} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {MAX_ALLOWED_REACTIONS} from '@constants/emoji';
import {isMinimumServerVersion} from '@utils/helpers';
import {isSystemMessage} from '@utils/post';
import {getPostIdsForCombinedUserActivityPost} from '@utils/post_list';
import {hasPermissionForChannel, hasPermissionForPost} from '@utils/role';
import {isSystemAdmin} from '@utils/user';

import PostOptions from './post_options';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type ReactionModel from '@typings/database/models/servers/reaction';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

type EnhancedProps = WithDatabaseArgs & {
    combinedPost?: Post;
    post: PostModel;
    showAddReaction: boolean;
    location: string;
}

const {POST, USER, SYSTEM, PREFERENCE} = MM_TABLES.SERVER;
const {CURRENT_USER_ID, LICENSE, CONFIG} = SYSTEM_IDENTIFIERS;

const canEditPost = (isOwner: boolean, post: PostModel, postEditTimeLimit: number, isLicensed: boolean, channel: ChannelModel, user: UserModel): boolean => {
    if (!post || isSystemMessage(post)) {
        return false;
    }

    let cep: boolean;

    const permissions = [Permissions.EDIT_POST];
    if (!isOwner) {
        permissions.push(Permissions.EDIT_OTHERS_POSTS);
    }

    cep = permissions.every((permission) => hasPermissionForChannel(channel, user, permission, false));
    if (isLicensed && postEditTimeLimit !== -1) {
        const timeLeft = (post.createAt + (postEditTimeLimit * 1000)) - Date.now();
        if (timeLeft <= 0) {
            cep = false;
        }
    }

    return cep;
};

const withPost = withObservables([], ({post, database}: {post: Post | PostModel} & WithDatabaseArgs) => {
    let id: string | undefined;
    let combinedPost: Observable<Post | undefined> = of$(undefined);
    if (post.type === Post.POST_TYPES.COMBINED_USER_ACTIVITY && post.props?.system_post_ids) {
        const systemPostIds = getPostIdsForCombinedUserActivityPost(post.id);
        id = systemPostIds?.pop();
        combinedPost = of$(post as Post);
    }
    const thePost = id ? database.get<PostModel>(POST).findAndObserve(id) : post;
    return {
        combinedPost,
        post: thePost,
    };
});

const enhanced = withObservables([], ({combinedPost, post, showAddReaction, location, database}: EnhancedProps) => {
    const channel = post.channel.observe();
    const channelIsArchived = channel.pipe(switchMap((ch: ChannelModel) => of$(ch.deleteAt !== 0)));
    const currentUser = database.get<SystemModel>(SYSTEM).findAndObserve(CURRENT_USER_ID).pipe(switchMap(({value}) => database.get<UserModel>(USER).findAndObserve(value)));
    const config = database.get<SystemModel>(SYSTEM).findAndObserve(CONFIG).pipe(switchMap(({value}) => of$(value as ClientConfig)));
    const isLicensed = database.get<SystemModel>(SYSTEM).findAndObserve(LICENSE).pipe(switchMap(({value}) => of$(value.IsLicensed === 'true')));
    const allowEditPost = config.pipe(switchMap((cfg) => of$(cfg.AllowEditPost)));
    const serverVersion = config.pipe(switchMap((cfg) => cfg.Version));
    const postEditTimeLimit = config.pipe(switchMap((cfg) => of$(parseInt(cfg.PostEditTimeLimit || '-1', 10))));

    const canPostPermission = combineLatest([channel, currentUser]).pipe(switchMap(([c, u]) => from$(hasPermissionForChannel(c, u, Permissions.CREATE_POST, false))));
    const hasAddReactionPermission = currentUser.pipe(switchMap((u) => from$(hasPermissionForPost(post, u, Permissions.ADD_REACTION, true))));
    const canDeletePostPermission = currentUser.pipe(switchMap((u) => {
        const isOwner = post.userId === u.id;
        return from$(hasPermissionForPost(post, u, isOwner ? Permissions.DELETE_POST : Permissions.DELETE_OTHERS_POSTS, false));
    }));

    const experimentalTownSquareIsReadOnly = config.pipe(switchMap((value) => of$(value.ExperimentalTownSquareIsReadOnly === 'true')));
    const channelIsReadOnly = combineLatest([currentUser, channel, experimentalTownSquareIsReadOnly]).pipe(switchMap(([u, c, readOnly]) => {
        return of$(c?.name === General.DEFAULT_CHANNEL && !isSystemAdmin(u.roles) && readOnly);
    }));

    const isUnderMaxAllowedReactions = post.reactions.observe().pipe(
        // eslint-disable-next-line max-nested-callbacks
        switchMap((reactions: ReactionModel[]) => of$(new Set(reactions.map((r) => r.emojiName)).size < MAX_ALLOWED_REACTIONS)),
    );

    const canEditUntil = combineLatest([isLicensed, allowEditPost, postEditTimeLimit, serverVersion, channelIsArchived, channelIsReadOnly]).pipe(
        switchMap(([ls, alw, limit, semVer, isArchived, isReadOnly]) => {
            if (!isArchived && !isReadOnly && ls && ((alw === Permissions.ALLOW_EDIT_POST_TIME_LIMIT && !isMinimumServerVersion(semVer, 6)) || (limit !== -1))) {
                return of$(post.createAt + (limit * (1000)));
            }
            return of$(-1);
        }),
    );

    const canReply = combineLatest([channelIsArchived, channelIsReadOnly, canPostPermission]).pipe(switchMap(([isArchived, isReadOnly, canPost]) => {
        return of$(!isArchived && !isReadOnly && location !== Screens.THREAD && !isSystemMessage(post) && canPost);
    }));

    const canPin = combineLatest([channelIsArchived, channelIsReadOnly]).pipe(switchMap(([isArchived, isReadOnly]) => {
        return of$(!isSystemMessage(post) && !isArchived && !isReadOnly);
    }));

    const isSaved = database.get<PreferenceModel>(PREFERENCE).query(Q.where('category', Preferences.CATEGORY_SAVED_POST), Q.where('name', post.id)).observe().pipe(switchMap((pref) => of$(Boolean(pref[0]?.value === 'true'))));

    const canEdit = combineLatest([postEditTimeLimit, isLicensed, channel, currentUser, channelIsArchived, channelIsReadOnly, canEditUntil, canPostPermission]).pipe(switchMap(([lt, ls, c, u, isArchived, isReadOnly, until, canPost]) => {
        const isOwner = u.id === post.userId;
        const canEditPostPermission = canEditPost(isOwner, post, lt, ls, c, u);
        const timeNotReached = (until === -1) || (until > Date.now());
        return of$(canEditPostPermission && !isArchived && !isReadOnly && timeNotReached && canPost);
    }));

    const canMarkAsUnread = combineLatest([currentUser, channelIsArchived]).pipe(
        switchMap(([user, isArchived]) => of$(!isArchived && user.id !== post.userId && !isSystemMessage(post))),
    );

    const canAddReaction = combineLatest([hasAddReactionPermission, channelIsReadOnly, isUnderMaxAllowedReactions, channelIsArchived]).pipe(
        switchMap(([permission, readOnly, maxAllowed, isArchived]) => {
            return of$(!isSystemMessage(post) && permission && !readOnly && !isArchived && maxAllowed && showAddReaction);
        }),
    );

    const canDelete = combineLatest([canDeletePostPermission, channelIsArchived, channelIsReadOnly, canPostPermission]).pipe(switchMap(([permission, isArchived, isReadOnly, canPost]) => {
        return of$(permission && !isArchived && !isReadOnly && canPost);
    }));

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
    };
});

export default withDatabase(withPost(enhanced(PostOptions)));


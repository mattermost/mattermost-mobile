// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, from as from$, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General, Permissions, Preferences, Screens} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {MAX_ALLOWED_REACTIONS} from '@constants/emoji';
import {isMinimumServerVersion} from '@utils/helpers';
import {isSystemMessage} from '@utils/post';
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

const {USER, SYSTEM, PREFERENCE} = MM_TABLES.SERVER;
const {CURRENT_USER_ID, LICENSE, CONFIG} = SYSTEM_IDENTIFIERS;

const canEditPost = (isOwner: boolean, post: PostModel, postEditTimeLimit: number, isLicensed: boolean, channel: ChannelModel, user: UserModel): boolean => {
    if (!post || isSystemMessage(post)) {
        return false;
    }

    let cep: boolean;

    let permissions = [Permissions.EDIT_POST, Permissions.EDIT_OTHERS_POSTS];
    if (isOwner) {
        permissions = [Permissions.EDIT_POST];
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

const enhanced = withObservables([], ({post, showAddReaction, location, database}: WithDatabaseArgs & { post: PostModel; showAddReaction: boolean; location: string }) => {
    const channel = post.channel.observe();
    const channelIsArchived = channel.pipe(switchMap((ch: ChannelModel) => of$(ch.deleteAt !== 0)));
    const canMarkAsUnread = channelIsArchived.pipe(switchMap((value) => of$(!value)));
    const currentUser = database.get<SystemModel>(SYSTEM).findAndObserve(CURRENT_USER_ID).pipe(switchMap(({value}) => database.get<UserModel>(USER).findAndObserve(value)));

    const experimentalTownSquareIsReadOnly = database.get<SystemModel>(SYSTEM).findAndObserve(CONFIG).pipe(switchMap(({value}: {value: ClientConfig}) => of$(value.ExperimentalTownSquareIsReadOnly === 'true')));
    const channelIsReadOnly = combineLatest([currentUser, channel, experimentalTownSquareIsReadOnly]).pipe(switchMap(([u, c, readOnly]) => of$(c?.name === General.DEFAULT_CHANNEL && !isSystemAdmin(u.roles) && readOnly)));

    const hasAddReactionPermission = currentUser.pipe(switchMap((u) => from$(hasPermissionForPost(post, u, Permissions.ADD_REACTION, true))));

    const isUnderMaxAllowedReactions = post.reactions.observe().pipe(
        // eslint-disable-next-line max-nested-callbacks
        switchMap((reactions: ReactionModel[]) => of$(new Set(reactions.map((r) => r.emojiName)).size < MAX_ALLOWED_REACTIONS)),
    );
    const isNotSystemPost = post.observe().pipe(
        switchMap((p) => of$(!isSystemMessage(p))),
    );

    const canAddReaction = combineLatest([hasAddReactionPermission, channelIsReadOnly, isUnderMaxAllowedReactions, channelIsArchived]).pipe(
        switchMap(([permission, readOnly, maxAllowed, isArchived]) => {
            return of$(!isSystemMessage(post) && permission && !readOnly && !isArchived && maxAllowed && showAddReaction);
        }),
    );

    const canDeletePostPermission = currentUser.pipe(switchMap((u) => {
        const isOwner = post.userId === u.id;
        return from$(hasPermissionForPost(post, u, isOwner ? Permissions.DELETE_POST : Permissions.DELETE_OTHERS_POSTS, false));
    }));

    const canDelete = combineLatest([canDeletePostPermission, channelIsArchived, channelIsReadOnly]).pipe(switchMap(([permission, isArchived, isReadOnly]) => {
        const hasBeenDeleted = post.deleteAt !== 0;//|| post.state === Posts.POST_DELETED); //fixme: review this second condition
        return of$(permission && !isArchived && !isReadOnly && !hasBeenDeleted);
    }));

    const canPostPermission = combineLatest([channel, currentUser]).pipe(switchMap(([c, u]) => from$(hasPermissionForChannel(c, u, Permissions.CREATE_POST, false))));

    const canReply = combineLatest([canPostPermission, channelIsArchived, channelIsReadOnly, location]).pipe(switchMap(([permission, isArchived, isReadOnly, loc]) => {
        return of$(permission && !isArchived && !isReadOnly && loc !== Screens.THREAD && !isSystemMessage(post));
    }));

    const canPin = combineLatest([channelIsArchived, channelIsReadOnly]).pipe(switchMap(([isArchived, isReadOnly]) => {
        return of$(!isSystemMessage(post) && !isArchived && !isReadOnly);
    }));

    const isFlagged = database.get<PreferenceModel>(PREFERENCE).query(
        Q.where('category', Preferences.CATEGORY_FLAGGED_POST),
        Q.where('name', post.id),
    ).observe().pipe(switchMap((pref) => of$(Boolean(pref.length))));

    const isLicensed = database.get<SystemModel>(SYSTEM).findAndObserve(LICENSE).pipe(switchMap(({value}) => of$(value.IsLicensed === 'true')));
    const config = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(switchMap(({value}) => of$(value as ClientConfig)));
    const allowEditPost = config.pipe(switchMap((cfg) => of$(cfg.AllowEditPost)));
    const serverVersion = config.pipe(switchMap((cfg) => cfg.Version));
    const postEditTimeLimit = config.pipe(switchMap((cfg) => of$(parseInt(cfg.PostEditTimeLimit || '-1', 10))));

    const canEdit = combineLatest([postEditTimeLimit, isLicensed, channel, currentUser, channelIsArchived, channelIsReadOnly]).pipe(switchMap(([lt, ls, c, u, isArchived, isReadOnly]) => {
        const isOwner = u.id === post.userId;
        const canEditPostPermission = canEditPost(isOwner, post, lt, ls, c, u);
        return of$(canEditPostPermission && isSystemMessage(post) && !isArchived && !isReadOnly);
    }));

    const canEditUntil = combineLatest([canEdit, isLicensed, allowEditPost, postEditTimeLimit, serverVersion, channelIsArchived, channelIsReadOnly]).pipe(
        switchMap(([ct, ls, alw, limit, semVer, isArchived, isReadOnly]) => {
            if (ct && !isArchived && !isReadOnly && ls && ((alw === Permissions.ALLOW_EDIT_POST_TIME_LIMIT && !isMinimumServerVersion(semVer, 6)) || (limit !== -1))) {
                return of$(post.createAt + (limit * (1000)));
            }
            return of$(-1);
        }),
    );

    return {
        canMarkAsUnread,
        canAddReaction,
        canDelete,
        canReply,
        canCopyPermalink: isNotSystemPost,
        canSave: isNotSystemPost,
        canPin,
        isFlagged,
        canEdit,
        canEditUntil,
    };
});

export default withDatabase(enhanced(PostOptions));


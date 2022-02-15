// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, Database} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, from as from$, Observable, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General, Permissions, Preferences, Screens} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {MAX_ALLOWED_REACTIONS} from '@constants/emoji';
import PreferenceModel from '@typings/database/models/servers/preference';
import {isMinimumServerVersion} from '@utils/helpers';
import {isSystemMessage} from '@utils/post';
import {hasPermissionForChannel, hasPermissionForPost} from '@utils/role';
import {isSystemAdmin} from '@utils/user';

import PostOptions from './post_options';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

const {USER, SYSTEM, PREFERENCE} = MM_TABLES.SERVER;
const {CURRENT_USER_ID, LICENSE, CONFIG} = SYSTEM_IDENTIFIERS;

const checkChannelReadOnly = (database: Database, channel: Observable<ChannelModel>, currentUser: Observable<UserModel>) => {
    const experimentalTownSquareIsReadOnly = database.get<SystemModel>(SYSTEM).findAndObserve(CONFIG).pipe(
        switchMap(({value}: {value: ClientConfig}) => of$(value.ExperimentalTownSquareIsReadOnly === 'true')),
    );
    return combineLatest([currentUser, channel, experimentalTownSquareIsReadOnly]).pipe(
        switchMap(([u, c, readOnly]) => of$(c?.name === General.DEFAULT_CHANNEL && !isSystemAdmin(u.roles) && readOnly)),
    );
};

function canEditPost(isOwner: boolean, post: PostModel, postEditTimeLimit: number, isLicensed: boolean, channel: ChannelModel, user: UserModel): boolean {
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
}

const enhanced = withObservables(['post'], ({post, showAddReaction, location, database}: WithDatabaseArgs & { post: PostModel; showAddReaction: boolean; location: string }) => {
    const currentUserId = database.get<SystemModel>(SYSTEM).findAndObserve(CURRENT_USER_ID).pipe(switchMap(({value}) => of$(value)));
    const currentUser = currentUserId.pipe(switchMap((userId) => database.get<UserModel>(USER).findAndObserve(userId)));
    const channel = post.channel.observe();

    const config = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(switchMap(({value}) => of$(value as ClientConfig)));
    const allowEditPost = config.pipe(switchMap((cfg) => of$(cfg.AllowEditPost)));
    const serverVersion = config.pipe(switchMap((cfg) => cfg.Version));
    const postEditTimeLimit = config.pipe(switchMap((cfg) => of$(parseInt(cfg.PostEditTimeLimit || '-1', 10))));

    const isLicensed = database.get<SystemModel>(SYSTEM).findAndObserve(LICENSE).pipe(switchMap(({value}) => of$(value.IsLicensed === 'true')));
    const channelDeleteAt = channel.pipe(switchMap((c: ChannelModel) => of$(c.deleteAt)));
    const channelIsArchived = channelDeleteAt.pipe(switchMap((cda) => of$(Boolean(cda !== 0))));

    const isChannelReadOnly = checkChannelReadOnly(database, channel, currentUser);
    const isSystemPost = isSystemMessage(post);

    const isFlagged = database.get<PreferenceModel>(PREFERENCE).query(Q.where('category', Preferences.CATEGORY_FLAGGED_POST), Q.where('name', post.id)).observe().pipe(switchMap((pref) => of$(Boolean(pref.length))));
    const isOwner = currentUserId === of$(post.userId);

    const hasBeenDeleted = post.deleteAt !== 0;// fixme : Enquire about the second part of the condition || post.state === WebsocketEvents.POST_DELETED);

    let canMarkAsUnread: Observable<boolean> = of$(true);
    let canReply: Observable<boolean> = of$(true);
    let canCopyPermalink: Observable<boolean> = of$(true);
    const canCopyText: Observable<boolean> = of$(false);
    let canEdit: Observable<boolean> = of$(false);
    let canEditUntil: Observable<number> = of$(-1);
    let canFlag: Observable<boolean> = of$(true);
    let canPin: Observable<boolean> = of$(true);

    let canAddReaction = currentUser.pipe(switchMap((u) => from$(hasPermissionForPost(post, u, Permissions.ADD_REACTION, true))));
    const canPost = combineLatest([channel, currentUser]).pipe(switchMap(([c, u]) => from$(hasPermissionForChannel(c, u, Permissions.CREATE_POST, false))));

    let canDelete = of$(false);
    if (post && channelDeleteAt === of$(0)) {
        canDelete = currentUser.pipe(switchMap((u) => from$(hasPermissionForPost(post, u, isOwner ? Permissions.DELETE_POST : Permissions.DELETE_OTHERS_POSTS, false))));
    }

    if (location === Screens.THREAD) {
        canReply = of$(false);
    }

    if (channelIsArchived || isChannelReadOnly) {
        canAddReaction = of$(false);
        canReply = of$(false);
        canDelete = of$(false);
        canPin = of$(false);
    } else {
        canEdit = combineLatest([postEditTimeLimit, isLicensed, channel, currentUser]).pipe(switchMap(([lt, ls, c, u]) => of$(Boolean(canEditPost(isOwner, post, lt, ls, c, u)))));

        canEditUntil = combineLatest([canEdit, isLicensed, allowEditPost, postEditTimeLimit, serverVersion]).pipe(
            switchMap(([ct, ls, alw, limit, v]) => {
                if (ct && ls && ((alw === Permissions.ALLOW_EDIT_POST_TIME_LIMIT && !isMinimumServerVersion(v, 6)) || (limit !== -1))) {
                    return of$(post.createAt + (limit * (1000)));
                }
                return of$(-1);
            }),
        );
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
    if (hasBeenDeleted) {
        canDelete = of$(false);
    }

    if (!showAddReaction) {
        canAddReaction = of$(false);
    }

    if (channelIsArchived) {
        canMarkAsUnread = of$(false);
    }

    // near the end

    if (!showAddReaction) {
        canAddReaction = of$(false);
    }

    const isUnderMaxAllowedReactions = post.reactions.observe().pipe(
        // eslint-disable-next-line max-nested-callbacks
        switchMap((reactionArr) => reactionArr.reduce((acc, v) => acc.add(v), new Set<string>())),
        switchMap((reactionSet: Set<string>) => of$(reactionSet.size < MAX_ALLOWED_REACTIONS)),
    );

    return {
        isFlagged,
        currentUser,
        isSystemPost,
        post,

        //fixme: Validate everything below and validate all your exports
        canMarkAsUnread,
        canCopyText,
        canReply,
        canCopyPermalink,
        canEdit,
        canEditUntil,
        canDelete,
        canFlag,
        canPin,
        canAddReaction: canAddReaction && isUnderMaxAllowedReactions, // reactionsCount: post.reactions.observeCount(),
    };
});

export default withDatabase(enhanced(PostOptions));


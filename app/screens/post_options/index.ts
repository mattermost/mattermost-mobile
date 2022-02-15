// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, Database} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, from as from$, Observable, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General, Permissions, Preferences, Screens, WebsocketEvents} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
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

const enhanced = withObservables(['post'], ({post, showAddReaction, location, database}: WithDatabaseArgs & {
    post: PostModel;
    showAddReaction: boolean;
    location: string;
}) => {
    const currentUserId = database.get<SystemModel>(SYSTEM).findAndObserve(CURRENT_USER_ID).pipe(switchMap(({value}) => of$(value)));
    const currentUser = currentUserId.pipe(switchMap((userId) => database.get<UserModel>(USER).findAndObserve(userId)));
    const channel = post.channel.observe();

    const config = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(switchMap(({value}) => of$(value as ClientConfig)));
    const allowEditPost = config.pipe(switchMap((cfg) => of$(Boolean(cfg.AllowEditPost === 'true'))));
    const postEditTimeLimit = config.pipe(switchMap((cfg) => of$(Boolean(cfg.PostEditTimeLimit === 'true'))));

    const isLicensed = database.get<SystemModel>(SYSTEM).findAndObserve(LICENSE).pipe(switchMap(({value}) => of$(value.IsLicensed === 'true')));
    const channelDeleteAt = channel.pipe(switchMap((c: ChannelModel) => of$(c.deleteAt)));
    const channelIsArchived = channelDeleteAt.pipe(switchMap((cda) => of$(Boolean(cda !== 0))));

    const isChannelReadOnly = checkChannelReadOnly(database, channel, currentUser);
    const isSystemPost = isSystemMessage(post);

    const isFlagged = database.get<PreferenceModel>(PREFERENCE).query(Q.where('category', Preferences.CATEGORY_FLAGGED_POST), Q.where('name', post.id)).observe().pipe(switchMap((pref) => of$(Boolean(pref.length))));
    const isOwner = currentUserId === of$(post.userId);

    const hasBeenDeleted = (post.deleteAt !== 0 || post.state === WebsocketEvents.POST_DELETED);

    let canMarkAsUnread: Observable<boolean> = of$(true);
    let canReply: Observable<boolean> = of$(true);
    let canCopyPermalink: Observable<boolean> = of$(true);
    let canCopyText: Observable<boolean> = of$(false);
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
        canEdit = canEditPost(state, config, license, currentTeamId, currentChannelId, currentUserId, post);
        if (canEdit && license.IsLicensed === 'true' &&
            ((config.AllowEditPost === General.ALLOW_EDIT_POST_TIME_LIMIT && !isMinimumServerVersion(serverVersion, 6)) || (config.PostEditTimeLimit !== -1 && config.PostEditTimeLimit !== '-1'))
        ) {
            canEditUntil = post.create_at + (config.PostEditTimeLimit * 1000);
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
    if (hasBeenDeleted) {
        canDelete = of$(false);
    }

    if (!showAddReaction) {
        canAddReaction = of$(false);
    }

    if (!isSystemPost && managedConfig?.copyAndPasteProtection !== 'true' && post.message) {
        canCopyText = of$(true);
    }

    if (channelIsArchived) {
        canMarkAsUnread = of$(false);
    }

    // near the end

    if (!showAddReaction) {
        canAddReaction = of$(false);
    }

    return {
        currentUser,
        canMarkAsUnread,
        canCopyText,
        canReply,
        canCopyPermalink,
        canEdit,
        canEditUntil,
        canDelete,
        canFlag,
        canPin,
        canAddReaction: canAddReaction && selectEmojisCountFromReactions(reactions) < MAX_ALLOWED_REACTIONS,
    };
});

export default withDatabase(enhanced(PostOptions));


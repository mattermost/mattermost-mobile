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
            return of$(isNotSystemPost && permission && !readOnly && !isArchived && maxAllowed && showAddReaction);
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
        return of$(permission && !isArchived && !isReadOnly && loc !== Screens.THREAD && isNotSystemPost);
    }));

    const canPin = combineLatest([channelIsArchived, channelIsReadOnly]).pipe(switchMap(([isArchived, isReadOnly]) => {
        return of$(isNotSystemPost && !isArchived && !isReadOnly);
    }));

    const isFlagged = database.get<PreferenceModel>(PREFERENCE).query(
        Q.where('category', Preferences.CATEGORY_FLAGGED_POST),
        Q.where('name', post.id),
    ).observe().pipe(switchMap((pref) => of$(Boolean(pref.length))));

    return {
        canMarkAsUnread,
        canAddReaction,
        canDelete,
        canReply,
        canCopyPermalink: isNotSystemPost,
        canSave: isNotSystemPost,
        canPin,
        isFlagged,
    };
});

export default withDatabase(enhanced(PostOptions));


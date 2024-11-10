// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Model, Q, Query} from '@nozbe/watermelondb';
import {of as of$, combineLatestWith} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {MM_TABLES} from '@constants/database';

import {queryGroupsByNames} from './group';
import {querySavedPostsPreferences} from './preference';
import {getConfigValue, observeConfigBooleanValue} from './system';
import {queryUsersByUsername, observeUser, observeCurrentUser} from './user';

import type PostModel from '@typings/database/models/servers/post';
import type PostInChannelModel from '@typings/database/models/servers/posts_in_channel';
import type PostsInThreadModel from '@typings/database/models/servers/posts_in_thread';

const {SERVER: {POST, POSTS_IN_CHANNEL, POSTS_IN_THREAD}} = MM_TABLES;

export const prepareDeletePost = async (post: PostModel): Promise<Model[]> => {
    const preparedModels: Model[] = [post.prepareDestroyPermanently()];
    const relations: Array<Query<Model>> = [post.drafts, post.files, post.reactions];
    for await (const models of relations) {
        try {
            models.forEach((m) => {
                preparedModels.push(m.prepareDestroyPermanently());
            });
        } catch {
            // Record not found, do nothing
        }
    }

    // If the post is a root post, delete the postsInThread model
    if (!post.rootId) {
        try {
            const postsInThread = await post.postsInThread.fetch();
            if (postsInThread) {
                postsInThread.forEach((m) => {
                    preparedModels.push(m.prepareDestroyPermanently());
                });
            }
        } catch {
            // Record not found, do nothing
        }
    }

    // If thread exists, delete thread, participants and threadsInTeam
    try {
        const thread = await post.thread.fetch();
        if (thread) {
            const participants = await thread.participants.fetch();
            if (participants.length) {
                preparedModels.push(...participants.map((p) => p.prepareDestroyPermanently()));
            }
            const threadsInTeam = await thread.threadsInTeam.fetch();
            if (threadsInTeam.length) {
                preparedModels.push(...threadsInTeam.map((t) => t.prepareDestroyPermanently()));
            }
            preparedModels.push(thread.prepareDestroyPermanently());
        }
    } catch {
        // Thread not found, do nothing
    }

    return preparedModels;
};

export const getPostById = async (database: Database, postId: string) => {
    try {
        const postModel = await database.get<PostModel>(POST).find(postId);
        return postModel;
    } catch {
        return undefined;
    }
};

export const observePost = (database: Database, postId: string) => {
    return database.get<PostModel>(POST).query(Q.where('id', postId), Q.take(1)).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$(undefined))),
    );
};

export const observePostAuthor = (database: Database, post: PostModel) => {
    return observeUser(database, post.userId);
};

export const observePostSaved = (database: Database, postId: string) => {
    return querySavedPostsPreferences(database, postId).
        observeWithColumns(['value']).pipe(
            switchMap(
                (pref) => of$(Boolean(pref[0]?.value === 'true')),
            ),
        );
};

export const queryPostsInChannel = (database: Database, channelId: string) => {
    return database.get<PostInChannelModel>(POSTS_IN_CHANNEL).query(
        Q.where('channel_id', channelId),
        Q.sortBy('latest', Q.desc),
    );
};

export const queryPostsInThread = (database: Database, rootId: string, sorted = false, includeDeleted = false) => {
    const clauses: Q.Clause[] = [Q.where('root_id', rootId)];
    if (!includeDeleted) {
        clauses.unshift(Q.experimentalJoinTables([POST]));
        clauses.push(Q.on(POST, 'delete_at', Q.eq(0)));
    }

    if (sorted) {
        clauses.push(Q.sortBy('latest', Q.desc));
    }
    return database.get<PostsInThreadModel>(POSTS_IN_THREAD).query(...clauses);
};

export const queryPostReplies = (database: Database, rootId: string, excludeDeleted = true) => {
    const clauses: Q.Clause[] = [Q.where('root_id', rootId)];
    if (excludeDeleted) {
        clauses.push(Q.where('delete_at', Q.eq(0)));
    }
    return database.get<PostModel>(POST).query(...clauses);
};

export const getRecentPostsInThread = async (database: Database, rootId: string) => {
    const chunks = await queryPostsInThread(database, rootId, true, true).fetch();
    if (chunks.length) {
        const recent = chunks[0];
        const post = await getPostById(database, rootId);
        if (post) {
            return queryPostsChunk(database, post.channelId, recent.earliest, recent.latest).fetch();
        }
    }
    return [];
};

export const getLastPostInThread = async (database: Database, rootId: string) => {
    const chunks = await queryPostsInThread(database, rootId, true, true).fetch();
    if (chunks.length) {
        const recent = chunks[0];
        const post = await getPostById(database, rootId);
        if (post) {
            const posts = await queryPostsChunk(database, rootId, recent.earliest, recent.latest, true, true, 1).fetch();
            return posts[0];
        }
    }
    return undefined;
};

export const queryPostsChunk = (database: Database, id: string, earliest: number, latest: number, inThread = false, includeDeleted = false, limit = 0) => {
    const conditions: Q.Where[] = [Q.where('create_at', Q.between(earliest, latest))];
    if (inThread) {
        conditions.push(Q.where('root_id', id));
    } else {
        conditions.push(Q.where('channel_id', id));
    }

    if (!includeDeleted) {
        conditions.push(Q.where('delete_at', Q.eq(0)));
    }

    const clauses: Q.Clause[] = [
        Q.and(
            ...conditions,
        ),
        Q.sortBy('create_at', Q.desc),
    ];

    if (limit) {
        clauses.push(Q.take(limit));
    }

    return database.get<PostModel>(POST).query(...clauses);
};

export const getRecentPostsInChannel = async (database: Database, channelId: string, includeDeleted = false) => {
    const chunks = await queryPostsInChannel(database, channelId).fetch();
    if (chunks.length) {
        const recent = chunks[0];
        return queryPostsChunk(database, channelId, recent.earliest, recent.latest, false, includeDeleted).fetch();
    }
    return [];
};

export const queryPostsById = (database: Database, postIds: string[], sort?: Q.SortOrder) => {
    const clauses: Q.Clause[] = [Q.where('id', Q.oneOf(postIds))];
    if (sort) {
        clauses.push(Q.sortBy('create_at', sort));
    }
    return database.get<PostModel>(POST).query(...clauses);
};

export const queryPostsByType = (database: Database, type: string) => {
    const clauses: Q.Clause[] = [Q.where('type', type)];
    return database.get<PostModel>(POST).query(...clauses);
};

export const queryPostsBetween = (database: Database, earliest: number, latest: number, sort: Q.SortOrder | null, userId?: string, channelId?: string, rootId?: string) => {
    const andClauses = [Q.where('create_at', Q.between(earliest, latest))];
    if (channelId) {
        andClauses.push(Q.where('channel_id', channelId));
    }

    if (userId) {
        andClauses.push(Q.where('user_id', userId));
    }

    if (rootId != null) {
        andClauses.push(Q.where('root_id', rootId));
    }

    const clauses: Q.Clause[] = [Q.and(...andClauses)];
    if (sort != null) {
        clauses.push(Q.sortBy('create_at', sort));
    }
    return database.get<PostModel>(POST).query(...clauses);
};

export const queryPinnedPostsInChannel = (database: Database, channelId: string) => {
    return database.get<PostModel>(POST).query(
        Q.and(
            Q.where('channel_id', channelId),
            Q.where('is_pinned', Q.eq(true)),
        ),
        Q.sortBy('create_at', Q.asc),
    );
};

export const observePinnedPostsInChannel = (database: Database, channelId: string) => {
    return queryPinnedPostsInChannel(database, channelId).observe();
};

export const observeSavedPostsByIds = (database: Database, postIds: string[]) => {
    return querySavedPostsPreferences(database).extend(
        Q.where('name', Q.oneOf(postIds)),
    ).observeWithColumns(['name']).pipe(
        switchMap((prefs) => of$(new Set(prefs.map((p) => p.name)))),
    );
};

export const getIsPostPriorityEnabled = async (database: Database) => {
    const cfg = await getConfigValue(database, 'PostPriority');
    return cfg === 'true';
};

export const getIsPostAcknowledgementsEnabled = async (database: Database) => {
    const cfg = await getConfigValue(database, 'PostAcknowledgements');
    return cfg === 'true';
};

export const observeIsPostPriorityEnabled = (database: Database) => {
    return observeConfigBooleanValue(database, 'PostPriority');
};

export const observeIsPostAcknowledgementsEnabled = (database: Database) => {
    return observeConfigBooleanValue(database, 'PostAcknowledgements');
};

export const observePersistentNotificationsEnabled = (database: Database) => {
    const user = observeCurrentUser(database);
    const enabledForAll = observeConfigBooleanValue(database, 'AllowPersistentNotifications');
    const enabledForGuests = observeConfigBooleanValue(database, 'AllowPersistentNotificationsForGuests');
    return user.pipe(
        combineLatestWith(enabledForAll, enabledForGuests),
        switchMap(([u, forAll, forGuests]) => {
            if (u?.isGuest) {
                return of$(forAll && forGuests);
            }
            return of$(forAll);
        }),
        distinctUntilChanged(),

    );
};

export const countUsersFromMentions = async (database: Database, mentions: string[]) => {
    const groupsQuery = queryGroupsByNames(database, mentions).fetch();
    const usersQuery = queryUsersByUsername(database, mentions).fetchCount();
    const [groups, usersCount] = await Promise.all([groupsQuery, usersQuery]);
    return groups.reduce((acc, v) => acc + v.memberCount, usersCount);
};

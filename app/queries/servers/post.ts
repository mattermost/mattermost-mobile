// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Model, Q, Query} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {MM_TABLES} from '@constants/database';
import PostModel from '@typings/database/models/servers/post';

import {queryPreferencesByCategoryAndName} from './preference';

import type PostInChannelModel from '@typings/database/models/servers/posts_in_channel';
import type PostsInThreadModel from '@typings/database/models/servers/posts_in_thread';

const {SERVER: {POST, POSTS_IN_CHANNEL, POSTS_IN_THREAD}} = MM_TABLES;

export const prepareDeletePost = async (post: PostModel): Promise<Model[]> => {
    const preparedModels: Model[] = [post.prepareDestroyPermanently()];
    const relations: Array<Query<Model>> = [post.drafts, post.postsInThread];
    for await (const relation of relations) {
        try {
            const model = await relation.fetch();
            if (model) {
                model.forEach((m) => preparedModels.push(m.prepareDestroyPermanently()));
            }
        } catch {
            // Record not found, do nothing
        }
    }

    const associatedChildren: Array<Query<Model>|undefined> = [post.files, post.reactions];
    await Promise.all(associatedChildren.map(async (children) => {
        const models = await children?.fetch();
        models?.forEach((model) => preparedModels.push(model.prepareDestroyPermanently()));
    }));

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

export const observePostSaved = (database: Database, postId: string) => {
    return queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_SAVED_POST, postId).
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

export const queryPostsChunk = (database: Database, id: string, earliest: number, latest: number, inThread = false, includeDeleted = false) => {
    const conditions: Q.Condition[] = [Q.where('create_at', Q.between(earliest, latest))];
    if (inThread) {
        conditions.push(Q.where('root_id', id));
    } else {
        conditions.push(Q.where('channel_id', id));
    }

    if (!includeDeleted) {
        conditions.push(Q.where('delete_at', Q.eq(0)));
    }

    return database.get<PostModel>(POST).query(
        Q.and(
            ...conditions,
        ),
        Q.sortBy('create_at', Q.desc),
    );
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
    );
};

export const observePinnedPostsInChannel = (database: Database, channelId: string) => {
    return queryPinnedPostsInChannel(database, channelId).observe();
};

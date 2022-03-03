// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Model, Q, Query, Relation} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type PostModel from '@typings/database/models/servers/post';
import type PostInChannelModel from '@typings/database/models/servers/posts_in_channel';
import type PostsInThreadModel from '@typings/database/models/servers/posts_in_thread';

const {SERVER: {POST, POSTS_IN_CHANNEL, POSTS_IN_THREAD}} = MM_TABLES;

export const prepareDeletePost = async (post: PostModel): Promise<Model[]> => {
    const preparedModels: Model[] = [post.prepareDestroyPermanently()];
    const relations: Array<Relation<Model> | Query<Model>> = [post.drafts, post.postsInThread];
    for await (const relation of relations) {
        try {
            const model = await relation?.fetch();
            if (model) {
                if (Array.isArray(model)) {
                    model.forEach((m) => preparedModels.push(m.prepareDestroyPermanently()));
                } else {
                    preparedModels.push(model.prepareDestroyPermanently());
                }
            }
        } catch {
            // Record not found, do nothing
        }
    }

    const associatedChildren: Array<Query<any>> = [post.files, post.reactions];
    for await (const children of associatedChildren) {
        const models = await children.fetch?.() as Model[] | undefined;
        models?.forEach((model) => preparedModels.push(model.prepareDestroyPermanently()));
    }

    return preparedModels;
};

export const queryPostById = async (database: Database, postId: string) => {
    try {
        const userRecord = (await database.collections.get(MM_TABLES.SERVER.POST).find(postId)) as PostModel;
        return userRecord;
    } catch {
        return undefined;
    }
};

export const queryPostsInChannel = (database: Database, channelId: string): Promise<PostInChannelModel[]> => {
    try {
        return database.get<PostInChannelModel>(POSTS_IN_CHANNEL).query(
            Q.where('channel_id', channelId),
            Q.sortBy('latest', Q.desc),
        ).fetch();
    } catch {
        return Promise.resolve([]);
    }
};

export const queryPostsInThread = (database: Database, rootId: string): Promise<PostsInThreadModel[]> => {
    try {
        return database.get<PostsInThreadModel>(POSTS_IN_THREAD).query(
            Q.where('root_id', rootId),
            Q.sortBy('latest', Q.desc),
        ).fetch();
    } catch {
        return Promise.resolve([]);
    }
};

export const queryRecentPostsInThread = async (database: Database, rootId: string): Promise<PostModel[]> => {
    try {
        const chunks = await queryPostsInThread(database, rootId);
        if (chunks.length) {
            const recent = chunks[0];
            const post = await queryPostById(database, rootId);
            if (post) {
                return queryPostsChunk(database, post.channelId, recent.earliest, recent.latest);
            }
        }
        return Promise.resolve([]);
    } catch {
        return Promise.resolve([]);
    }
};

export const queryPostsChunk = (database: Database, channelId: string, earliest: number, latest: number): Promise<PostModel[]> => {
    try {
        return database.get(POST).query(
            Q.and(
                Q.where('channel_id', channelId),
                Q.where('create_at', Q.between(earliest, latest)),
                Q.where('delete_at', Q.eq(0)),
            ),
            Q.sortBy('create_at', Q.desc),
        ).fetch() as Promise<PostModel[]>;
    } catch {
        return Promise.resolve([]);
    }
};

export const queryRecentPostsInChannel = async (database: Database, channelId: string): Promise<PostModel[]> => {
    try {
        const chunks = await queryPostsInChannel(database, channelId);
        if (chunks.length) {
            const recent = chunks[0];
            return queryPostsChunk(database, channelId, recent.earliest, recent.latest);
        }
        return Promise.resolve([]);
    } catch {
        return Promise.resolve([]);
    }
};


// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {Database} from '@constants';
import {getPostListEdges} from '@database//operator/utils/post';
import {transformPostsInChannelRecord} from '@database/operator/server_data_operator/transformers/post';
import {emptyFunction} from '@utils/general';
import {logWarning} from '@utils/log';

import type PostsInChannelModel from '@typings/database/models/servers/posts_in_channel';

export interface PostsInChannelHandlerMix {
    handleReceivedPostsInChannel: (posts: Post[], prepareRecordsOnly?: boolean) => Promise<PostsInChannelModel[]>;
    handleReceivedPostsInChannelSince: (posts: Post[], prepareRecordsOnly?: boolean) => Promise<PostsInChannelModel[]>;
    handleReceivedPostsInChannelBefore: (posts: Post[], prepareRecordsOnly?: boolean) => Promise<PostsInChannelModel[]>;
    handleReceivedPostsInChannelAfter: (posts: Post[], prepareRecordsOnly?: boolean) => Promise<PostsInChannelModel[]>;
    handleReceivedPostForChannel: (post: Post, prepareRecordsOnly?: boolean) => Promise<PostsInChannelModel[]>;
}

const {POSTS_IN_CHANNEL} = Database.MM_TABLES.SERVER;

const PostsInChannelHandler = (superclass: any) => class extends superclass {
    _createPostsInChannelRecord = (channelId: string, earliest: number, latest: number, prepareRecordsOnly = false): Promise<PostsInChannelModel[]> => {
        // We should prepare instead of execute
        if (prepareRecordsOnly) {
            return this.prepareRecords({
                tableName: POSTS_IN_CHANNEL,
                createRaws: [{record: undefined, raw: {channel_id: channelId, earliest, latest}}],
                transformer: transformPostsInChannelRecord,
            });
        }
        return this.execute({
            createRaws: [{record: undefined, raw: {channel_id: channelId, earliest, latest}}],
            tableName: POSTS_IN_CHANNEL,
            transformer: transformPostsInChannelRecord,
        });
    };

    _mergePostInChannelChunks = async (newChunk: PostsInChannelModel, existingChunks: PostsInChannelModel[], prepareRecordsOnly = false) => {
        const result: PostsInChannelModel[] = [];
        for (const chunk of existingChunks) {
            if (newChunk.earliest <= chunk.earliest && newChunk.latest >= chunk.latest) {
                if (!prepareRecordsOnly) {
                    newChunk.prepareUpdate(emptyFunction);
                }
                result.push(newChunk);
                result.push(chunk.prepareDestroyPermanently());
                break;
            }
        }

        if (result.length && !prepareRecordsOnly) {
            await this.batchRecords(result);
        }

        return result;
    };

    handleReceivedPostsInChannel = async (posts?: Post[], prepareRecordsOnly = false): Promise<PostsInChannelModel[]> => {
        if (!posts?.length) {
            logWarning(
                'An empty or undefined "posts" array has been passed to the handleReceivedPostsInChannel method',
            );
            return [];
        }

        const {firstPost, lastPost} = getPostListEdges(posts);

        // Channel Id for this chain of posts
        const channelId = firstPost.channel_id;

        // Find smallest 'create_at' value in chain
        const earliest = firstPost.create_at;

        // Find highest 'create_at' value in chain; -1 means we are dealing with one item in the posts array
        const latest = lastPost.create_at;

        // Find the records in the PostsInChannel table that have a matching channel_id
        const chunks = (await this.database.get(POSTS_IN_CHANNEL).query(
            Q.where('channel_id', channelId),
            Q.sortBy('latest', Q.desc),
        ).fetch()) as PostsInChannelModel[];

        // chunk length 0; then it's a new chunk to be added to the PostsInChannel table
        if (chunks.length === 0) {
            return this._createPostsInChannelRecord(channelId, earliest, latest, prepareRecordsOnly);
        }

        let targetChunk: PostsInChannelModel|undefined;

        for (const chunk of chunks) {
            // find if we should plug the chain before
            if (firstPost.create_at >= chunk.earliest || latest <= chunk.latest) {
                targetChunk = chunk;
                break;
            }
        }

        if (targetChunk) {
            if (
                targetChunk.earliest <= earliest &&
                targetChunk.latest >= latest
            ) {
                return [];
            }

            // If the chunk was found, Update the chunk and return
            if (prepareRecordsOnly) {
                targetChunk.prepareUpdate((record) => {
                    record.earliest = Math.min(record.earliest, earliest);
                    record.latest = Math.max(record.latest, latest);
                });
                return [targetChunk];
            }

            targetChunk = await this.database.write(async () => {
                return targetChunk!.update((record) => {
                    record.earliest = Math.min(record.earliest, earliest);
                    record.latest = Math.max(record.latest, latest);
                });
            });

            return [targetChunk!];
        }

        // Create a new chunk and merge them if needed
        const newChunk = await this._createPostsInChannelRecord(channelId, earliest, latest, prepareRecordsOnly);
        const merged = await this._mergePostInChannelChunks(newChunk[0], chunks, prepareRecordsOnly);
        return merged;
    };

    handleReceivedPostsInChannelSince = async (posts: Post[], prepareRecordsOnly = false): Promise<PostsInChannelModel[]> => {
        if (!posts?.length) {
            logWarning(
                'An empty or undefined "posts" array has been passed to the handleReceivedPostsInChannelSince method',
            );
            return [];
        }

        const {firstPost} = getPostListEdges(posts);
        let latest = 0;

        let recentChunk: PostsInChannelModel|undefined;
        const chunks = (await this.database.get(POSTS_IN_CHANNEL).query(
            Q.where('channel_id', firstPost.channel_id),
            Q.sortBy('latest', Q.desc),
        ).fetch()) as PostsInChannelModel[];

        if (chunks.length) {
            recentChunk = chunks[0];

            // add any new recent post while skipping the ones that were just updated
            for (const post of posts) {
                if (post.create_at > recentChunk.latest) {
                    latest = post.create_at;
                }
            }
        }

        if (recentChunk && recentChunk.latest < latest) {
            // We've got new posts that belong to this chunk
            if (prepareRecordsOnly) {
                recentChunk.prepareUpdate((record) => {
                    record.latest = Math.max(record.latest, latest);
                });

                return [recentChunk];
            }

            recentChunk = await this.database.write(async () => {
                return recentChunk!.update((record) => {
                    record.latest = Math.max(record.latest, latest);
                });
            });

            return [recentChunk!];
        }

        return [];
    };

    handleReceivedPostsInChannelBefore = async (posts: Post[], prepareRecordsOnly = false): Promise<PostsInChannelModel[]> => {
        if (!posts?.length) {
            logWarning(
                'An empty or undefined "posts" array has been passed to the handleReceivedPostsInChannelBefore method',
            );
            return [];
        }

        const {firstPost} = getPostListEdges(posts);

        // Channel Id for this chain of posts
        const channelId = firstPost.channel_id;

        // Find smallest 'create_at' value in chain
        const earliest = firstPost.create_at;

        // Find the records in the PostsInChannel table that have a matching channel_id
        const chunks = (await this.database.get(POSTS_IN_CHANNEL).query(
            Q.where('channel_id', channelId),
            Q.sortBy('latest', Q.desc),
        ).fetch()) as PostsInChannelModel[];

        if (chunks.length === 0) {
            // No chunks found, previous posts in this block not found
            return [];
        }

        let targetChunk = chunks[0];
        if (targetChunk) {
            if (targetChunk.earliest <= earliest) {
                return [];
            }

            // If the chunk was found, Update the chunk and return
            if (prepareRecordsOnly) {
                targetChunk.prepareUpdate((record) => {
                    record.earliest = Math.min(record.earliest, earliest);
                });
                return [targetChunk];
            }

            targetChunk = await this.database.write(async () => {
                return targetChunk!.update((record) => {
                    record.earliest = Math.min(record.earliest, earliest);
                });
            });

            return [targetChunk!];
        }

        return targetChunk;
    };

    handleReceivedPostsInChannelAfter = async (posts: Post[], prepareRecordsOnly = false): Promise<PostsInChannelModel[]> => {
        throw new Error(`handleReceivedPostsInChannelAfter Not implemented yet. posts count${posts.length} prepareRecordsOnly=${prepareRecordsOnly}`);
    };

    handleReceivedPostForChannel = async (posts: Post[], prepareRecordsOnly = false): Promise<PostsInChannelModel[]> => {
        if (!posts?.length) {
            logWarning(
                'An empty or undefined "posts" array has been passed to the handleReceivedPostForChannel method',
            );
            return [];
        }

        const {firstPost, lastPost} = getPostListEdges(posts);

        // Channel Id for this chain of posts
        const channelId = firstPost.channel_id;

        // Find smallest 'create_at' value in chain
        const earliest = firstPost.create_at;

        // Find highest 'create_at' value in chain; -1 means we are dealing with one item in the posts array
        const latest = lastPost.create_at;

        // Find the records in the PostsInChannel table that have a matching channel_id
        const chunks = (await this.database.get(POSTS_IN_CHANNEL).query(
            Q.where('channel_id', channelId),
            Q.sortBy('latest', Q.desc),
        ).fetch()) as PostsInChannelModel[];

        // chunk length 0; then it's a new chunk to be added to the PostsInChannel table
        if (chunks.length === 0) {
            return this._createPostsInChannelRecord(channelId, earliest, latest, prepareRecordsOnly);
        }

        let targetChunk = chunks[0];
        if (targetChunk) {
            if (targetChunk.latest >= latest) {
                return [];
            }

            // If the chunk was found, Update the chunk and return
            if (prepareRecordsOnly) {
                targetChunk.prepareUpdate((record) => {
                    record.latest = Math.max(record.latest, latest);
                });
                return [targetChunk];
            }

            targetChunk = await this.database.write(async () => {
                return targetChunk!.update((record) => {
                    record.latest = Math.max(record.latest, latest);
                });
            });

            return [targetChunk!];
        }

        return targetChunk;
    };
};

export default PostsInChannelHandler;

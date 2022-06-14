// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionType, Post} from '@constants';
import DatabaseManager from '@database/manager';
import {getPostById, prepareDeletePost} from '@queries/servers/post';
import {getCurrentUserId} from '@queries/servers/system';
import {generateId} from '@utils/general';
import {getPostIdsForCombinedUserActivityPost} from '@utils/post_list';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

export const sendAddToChannelEphemeralPost = async (serverUrl: string, user: UserModel, addedUsernames: string[], messages: string[], channeId: string, postRootId = '') => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const timestamp = Date.now();
        const posts = addedUsernames.map((addedUsername, index) => {
            const message = messages[index];
            return {
                id: generateId(),
                user_id: user.id,
                channel_id: channeId,
                message,
                type: Post.POST_TYPES.EPHEMERAL_ADD_TO_CHANNEL as PostType,
                create_at: timestamp,
                edit_at: 0,
                update_at: timestamp,
                delete_at: 0,
                is_pinned: false,
                original_id: '',
                hashtags: '',
                pending_post_id: '',
                reply_count: 0,
                metadata: {},
                root_id: postRootId,
                props: {
                    username: user.username,
                    addedUsername,
                },
            } as Post;
        });

        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_NEW,
            order: posts.map((p) => p.id),
            posts,
        });

        return {posts};
    } catch (error) {
        // eslint-disable-next-line no-console
        console.log('Failed sendAddToChannelEphemeralPost', error);
        return {error};
    }
};

export const sendEphemeralPost = async (serverUrl: string, message: string, channeId: string, rootId = '', userId?: string) => {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        if (!channeId) {
            throw new Error('channel Id not defined');
        }

        let authorId = userId;
        if (!authorId) {
            authorId = await getCurrentUserId(database);
        }

        const timestamp = Date.now();
        const post = {
            id: generateId(),
            user_id: authorId,
            channel_id: channeId,
            message,
            type: Post.POST_TYPES.EPHEMERAL_ADD_TO_CHANNEL as PostType,
            create_at: timestamp,
            edit_at: 0,
            update_at: timestamp,
            delete_at: 0,
            is_pinned: false,
            original_id: '',
            hashtags: '',
            pending_post_id: '',
            reply_count: 0,
            metadata: {},
            participants: null,
            root_id: rootId,
            props: {},
        } as Post;

        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_NEW,
            order: [post.id],
            posts: [post],
        });

        return {post};
    } catch (error) {
        // eslint-disable-next-line no-console
        console.log('Failed sendEphemeralPost', error);
        return {error};
    }
};

export async function removePost(serverUrl: string, post: PostModel | Post) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        if (post.type === Post.POST_TYPES.COMBINED_USER_ACTIVITY && post.props?.system_post_ids) {
            const systemPostIds = getPostIdsForCombinedUserActivityPost(post.id);
            const removeModels = [];
            for await (const id of systemPostIds) {
                const postModel = await getPostById(database, id);
                if (postModel) {
                    const preparedPost = await prepareDeletePost(postModel);
                    removeModels.push(...preparedPost);
                }
            }

            if (removeModels.length) {
                await operator.batchRecords(removeModels);
            }
        } else {
            const postModel = await getPostById(database, post.id);
            if (postModel) {
                const preparedPost = await prepareDeletePost(postModel);
                if (preparedPost.length) {
                    await operator.batchRecords(preparedPost);
                }
            }
        }

        return {post};
    } catch (error) {
        // eslint-disable-next-line no-console
        console.log('Failed removePost', error);
        return {error};
    }
}

export async function markPostAsDeleted(serverUrl: string, post: Post, prepareRecordsOnly = false) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const dbPost = await getPostById(database, post.id);
        if (!dbPost) {
            throw new Error('Post not found');
        }

        const model = dbPost.prepareUpdate((p) => {
            p.deleteAt = Date.now();
            p.message = '';
            p.metadata = null;
            p.props = undefined;
        });

        if (!prepareRecordsOnly) {
            await operator.batchRecords([dbPost]);
        }
        return {model};
    } catch (error) {
        // eslint-disable-next-line no-console
        console.log('Failed markPostAsDeleted', error);
        return {error};
    }
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {postActionWithCookie} from '@actions/remote/post';
import {ActionType, Post} from '@constants';
import DatabaseManager from '@database/manager';
import {queryPostById} from '@queries/servers/post';
import {queryCurrentUserId} from '@queries/servers/system';
import {generateId} from '@utils/general';

import type UserModel from '@typings/database/models/servers/user';
import type PostModel from '@typings/database/models/servers/post';

export const sendAddToChannelEphemeralPost = async (serverUrl: string, user: UserModel, addedUsernames: string[], messages: string[], channeId: string, postRootId = '') => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

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
            participants: null,
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
};

export const sendEphemeralPost = async (serverUrl: string, message: string, channeId: string, rootId = '', userId?: string) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    if (!channeId) {
        return {error: 'channel Id not defined'};
    }

    let authorId = userId;
    if (!authorId) {
        authorId = await queryCurrentUserId(operator.database);
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
};

export const removePost = async (serverUrl: string, post: PostModel) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    if (post.type === Post.POST_TYPES.COMBINED_USER_ACTIVITY && post.props?.system_post_ids) {
        const systemPostIds = post.props.system_post_ids as string[];
        for await (const id of systemPostIds) {
            const postModel = await queryPostById(operator.database, id);
            if (postModel) {
                await operator.database.write(async () => {
                    await postModel.destroyPermanently();
                });
            }
        }
    } else {
        const postModel = await queryPostById(operator.database, post.id);
        if (postModel) {
            await operator.database.write(async () => {
                await postModel.destroyPermanently();
            });
        }
    }

    return {post};
};

export const selectAttachmentMenuAction = (serverUrl: string, postId: string, actionId: string, selectedOption: string) => {
    return postActionWithCookie(serverUrl, postId, actionId, '', selectedOption);
};

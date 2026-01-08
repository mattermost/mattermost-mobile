// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {removePost} from '@actions/local/post';
import {handleNewPostEvent, handlePostEdited} from '@actions/websocket/posts';
import {PostTypes} from '@constants/post';
import DatabaseManager from '@database/manager';
import {getPostById} from '@queries/servers/post';
import {logError} from '@utils/log';
import {getCurrentUser} from "@queries/servers/user";
import {isOwnBoRPost} from "@utils/bor";
import {PostModel} from "@database/models/server";
import {ActionType} from "@constants";

export async function handleBoRPostRevealedEvent(serverUrl: string, msg: WebSocketMessage) {
    try {
        const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
        if (!operator) {
            return {};
        }

        const {database} = operator;
        let post: Post;
        try {
            post = JSON.parse(msg.data.post);
        } catch {
            return {};
        }

        const existingPost = await getPostById(database, post.id);
        if (existingPost) {
            await handlePostEdited(serverUrl, msg);
        } else {
            await handleNewPostEvent(serverUrl, msg);
        }

        return {};
    } catch (error) {
        logError('handleBoRPostRevealedEvent could not handle websocket event for revealed burn-on-read post', error);
        return {error};
    }
}

export async function handleBoRPostBurnedEvent(serverUrl: string, msg: WebSocketMessage) {
    try {
        const postId = msg.data.post_id;
        const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
        if (!operator) {
            return null;
        }

        const {database} = operator;
        const post = await getPostById(database, postId);
        if (!post) {
            return null;
        }

        if (post.type !== PostTypes.BURN_ON_READ) {
            return null;
        }

        await removePost(serverUrl, post);
        return {};
    } catch (error) {
        logError('handleBoRPostBurnedEvent could not handle websocket event for burned burn-on-read post', error);
        return {error};
    }
}
export async function handleBoRPostAllRevealed(serverUrl: string, msg: WebSocketMessage) {
    console.log('handleBoRPostAllRevealed called...');
    try {
        const postId = msg.data.post_id;
        const expireAt = msg.data.sender_expire_at;

        const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
        if (!operator) {
            return null;
        }

        const {database} = operator;
        const post = await getPostById(database, postId);
        if (!post) {
            return null;
        }

        const currentUser = await getCurrentUser(database);
        if (!isOwnBoRPost(post, currentUser)) {
            return null;
        }

        // This converts PostModel to Post
        const updatedPost: Post = await post.toApi();
        updatedPost.metadata.expire_at = expireAt;

        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_NEW,
            order: [updatedPost.id],
            posts: [updatedPost],
            prepareRecordsOnly: false,
        });

        return {post: updatedPost};

    } catch (error) {
        logError('handleBoRPostAllRevealed could not handle websocket event for all revealed burn-on-read posts', error);
        return {error};
    }
}

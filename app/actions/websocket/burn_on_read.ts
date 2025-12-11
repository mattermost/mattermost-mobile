// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {removePost} from '@actions/local/post';
import {handleNewPostEvent, handlePostEdited} from '@actions/websocket/posts';
import {PostTypes} from '@constants/post';
import DatabaseManager from '@database/manager';
import {getPostById} from '@queries/servers/post';
import {logError} from '@utils/log';

export async function handleBoRPostRevealedEvent(serverUrl: string, msg: WebSocketMessage) {
    try {
        const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
        if (!operator) {
            return null;
        }

        const {database} = operator;
        let post: Post;
        try {
            post = JSON.parse(msg.data.post);
        } catch {
            return null;
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

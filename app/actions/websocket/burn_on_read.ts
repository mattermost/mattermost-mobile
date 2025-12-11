// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {handleNewPostEvent, handlePostEdited} from '@actions/websocket/posts';
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

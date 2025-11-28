// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {handleNewPostEvent, handlePostEdited} from '@actions/websocket/posts';
import DatabaseManager from '@database/manager';
import {getPostById} from '@queries/servers/post';

export async function handleBoRPostRevealedEvent(serverUrl: string, msg: WebSocketMessage) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    const {database} = operator;
    let post: Post;
    try {
        post = JSON.parse(msg.data.post);
    } catch {
        return;
    }

    const existingPost = await getPostById(database, post.id);
    if (existingPost) {
        await handlePostEdited(serverUrl, msg);
    } else {
        await handleNewPostEvent(serverUrl, msg);
    }
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {queryPostsInChannel} from '@queries/servers/post';

import type PostModel from '@typings/database/models/servers/post';

export const updatePostSinceCache = async (serverUrl: string, notification: NotificationWithData) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        if (notification.payload?.channel_id) {
            const {database} = operator;
            const chunks = await queryPostsInChannel(database, notification.payload.channel_id);
            if (chunks.length) {
                const recent = chunks[0];
                const lastPost = await database.get<PostModel>(MM_TABLES.SERVER.POST).find(notification.payload.post_id);
                await operator.database.write(async () => {
                    await recent.update(() => {
                        recent.latest = lastPost.createAt;
                    });
                });
            }
        }
        return {};
    } catch (error) {
        return {error};
    }
};


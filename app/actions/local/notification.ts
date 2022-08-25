// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getPostById, queryPostsInChannel, queryPostsInThread} from '@queries/servers/post';
import {logError} from '@utils/log';

export const updatePostSinceCache = async (serverUrl: string, notification: NotificationWithData) => {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        if (notification.payload?.channel_id) {
            const chunks = await queryPostsInChannel(database, notification.payload.channel_id).fetch();
            if (chunks.length) {
                const recent = chunks[0];
                const lastPost = await getPostById(database, notification.payload.post_id);
                if (lastPost) {
                    await operator.database.write(async () => {
                        await recent.update(() => {
                            recent.latest = lastPost.createAt;
                        });
                    });
                }
            }
        }
        return {};
    } catch (error) {
        logError('Failed updatePostSinceCache', error);
        return {error};
    }
};

export const updatePostsInThreadsSinceCache = async (serverUrl: string, notification: NotificationWithData) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        if (notification.payload?.root_id) {
            const {database} = operator;
            const chunks = await queryPostsInThread(database, notification.payload.root_id).fetch();
            if (chunks.length) {
                const recent = chunks[0];
                const lastPost = await getPostById(database, notification.payload.post_id);
                if (lastPost) {
                    await operator.database.write(async () => {
                        await recent.update(() => {
                            recent.latest = lastPost.createAt;
                        });
                    });
                }
            }
        }
        return {};
    } catch (error) {
        return {error};
    }
};

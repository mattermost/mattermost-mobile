// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getMyChannel} from '@queries/servers/channel';
import {logError} from '@utils/log';

export async function updateLastPlaybookFetchAt(serverUrl: string, channelId: string, lastPlaybookFetchAt: number) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const myChannel = await getMyChannel(database, channelId);
        if (!myChannel) {
            return {data: false};
        }
        await database.write(async () => {
            await myChannel.update((c) => {
                c.lastPlaybookFetchAt = lastPlaybookFetchAt;
            });
        });
        return {data: true};
    } catch (error) {
        logError('Failed updateLastPlaybookFetchAt', error);
        return {error};
    }
}

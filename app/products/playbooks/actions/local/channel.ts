// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getMyChannel} from '@queries/servers/channel';
import {logError} from '@utils/log';

export async function updateLastPlaybookRunsFetchAt(serverUrl: string, channelId: string, lastPlaybookRunsFetchAt: number) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const myChannel = await getMyChannel(database, channelId);
        if (!myChannel) {
            return {data: false};
        }
        await database.write(async () => {
            await myChannel.update((c) => {
                c.lastPlaybookRunsFetchAt = lastPlaybookRunsFetchAt;
            });
        });
        return {data: true};
    } catch (error) {
        logError('Failed updateLastPlaybookRunsFetchAt', error);
        return {error};
    }
}

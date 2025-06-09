// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getMyChannel} from '@queries/servers/channel';

export async function updateLastPlaybookFetchAt(serverUrl: string, channelId: string, lastPlaybookFetchAt: number) {
    const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    const myChannel = await getMyChannel(database, channelId);
    if (!myChannel) {
        return;
    }
    await myChannel.update((c) => {
        c.lastPlaybookFetchAt = lastPlaybookFetchAt;
    });
}

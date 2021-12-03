// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchMe} from '@actions/remote/user';
import DatabaseManager from '@database/manager';
import {queryCurrentUser} from '@queries/servers/user';

export async function handleUserUpdatedEvent(serverUrl: string, msg: any) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }
    const currentUser = await queryCurrentUser(database.database);
    const user = msg.data.user;

    if (user.id === currentUser?.id) {
        if (user.update_at > (currentUser?.updateAt || 0)) {
            // Need to request me to make sure we don't override with sanitized fields from the
            // websocket event
            fetchMe(serverUrl, false);
        }
    } else {
        database.operator.handleUsers({users: [user], prepareRecordsOnly: false});
    }
}

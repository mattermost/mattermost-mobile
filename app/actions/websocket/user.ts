// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {Events} from '@app/constants';
import {queryActiveServer} from '@app/queries/app/servers';
import {queryConfig} from '@app/queries/servers/system';
import DatabaseManager from '@database/manager';
import WebsocketManager from '@init/websocket_manager';

export async function handleUserTypingEvent(serverUrl: string, msg: any) {
    const currentServer = await queryActiveServer(DatabaseManager.appDatabase!.database);
    if (currentServer?.url === serverUrl) {
        const database = DatabaseManager.serverDatabases[serverUrl];
        if (!database) {
            return;
        }
        const config = await queryConfig(database.database);
        const data = {
            channelId: msg.broadcast.channel_id,
            rootId: msg.data.parent_id,
            userId: msg.data.user_id,
            now: Date.now(),
        };
        DeviceEventEmitter.emit(Events.USER_TYPING, data);

        setTimeout(() => {
            DeviceEventEmitter.emit(Events.USER_STOP_TYPING, data);
        }, parseInt(config.TimeBetweenUserTypingUpdatesMilliseconds, 10));
    }
}

export const userTyping = async (serverUrl: string, channelId: string, rootId?: string) => {
    const client = WebsocketManager.getClient(serverUrl);
    client.sendUserTypingEvent(channelId, rootId);
};

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {DeviceEventEmitter} from 'react-native';

import {getTeammateNameDisplaySetting} from '@app/helpers/api/preference';
import {Events, Preferences} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import WebsocketManager from '@init/websocket_manager';
import {queryActiveServer} from '@queries/app/servers';
import {queryConfig} from '@queries/servers/system';
import {queryCurrentUser, queryUserById} from '@queries/servers/user';
import PreferenceModel from '@typings/database/models/servers/preference';
import SystemModel from '@typings/database/models/servers/system';
import {displayUsername} from '@utils/user';

const {SERVER: {PREFERENCE, SYSTEM}} = MM_TABLES;
export async function handleUserTypingEvent(serverUrl: string, msg: any) {
    const currentServer = await queryActiveServer(DatabaseManager.appDatabase!.database);
    if (currentServer?.url === serverUrl) {
        const database = DatabaseManager.serverDatabases[serverUrl];
        if (!database) {
            return;
        }

        const user = await queryUserById(database.database, msg.data.user_id);
        const config = await queryConfig(database.database);
        const license = await database.database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.LICENSE);
        const preferences = await database.database.get<PreferenceModel>(PREFERENCE).query(Q.where('category', Preferences.CATEGORY_DISPLAY_SETTINGS)).fetch();
        const teammateDisplayNameSetting = await getTeammateNameDisplaySetting(preferences, config, license.value);
        const currentUser = await queryCurrentUser(database.database);
        const username = displayUsername(user, currentUser?.locale, teammateDisplayNameSetting);
        const data = {
            channelId: msg.broadcast.channel_id,
            rootId: msg.data.parent_id,
            userId: msg.data.user_id,
            username,
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

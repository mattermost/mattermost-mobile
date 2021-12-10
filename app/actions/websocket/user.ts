// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {fetchUsersByIds} from '@actions/remote/user';
import {Events, Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';
import WebsocketManager from '@init/websocket_manager';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {queryCommonSystemValues} from '@queries/servers/system';
import {queryCurrentUser, queryUserById} from '@queries/servers/user';
import {displayUsername} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

export async function handleUserTypingEvent(serverUrl: string, msg: any) {
    const currentServerUrl = await DatabaseManager.getActiveServerUrl();
    if (currentServerUrl === serverUrl) {
        const database = DatabaseManager.serverDatabases[serverUrl];
        if (!database) {
            return;
        }

        const {config, license} = await queryCommonSystemValues(database.database);

        let user: UserModel | UserProfile | undefined = await queryUserById(database.database, msg.data.user_id);
        if (user) {
            const {users} = await fetchUsersByIds(serverUrl, [msg.data.user_id]);
            user = users?.[0];
        }
        const namePreference = await queryPreferencesByCategoryAndName(database.database, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT);
        const teammateDisplayNameSetting = await getTeammateNameDisplaySetting(namePreference, config, license);
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
    client?.sendUserTypingEvent(channelId, rootId);
};

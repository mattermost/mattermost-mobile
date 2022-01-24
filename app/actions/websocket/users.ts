// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {DeviceEventEmitter} from 'react-native';

import {updateChannelsDisplayName} from '@actions/local/channel';
import {fetchMe, fetchUsersByIds} from '@actions/remote/user';
import {General, Events, Preferences} from '@constants';
import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';
import WebsocketManager from '@init/websocket_manager';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {queryCommonSystemValues} from '@queries/servers/system';
import {queryCurrentUser, queryUserById} from '@queries/servers/user';
import {displayUsername} from '@utils/user';

import type ChannelModel from '@typings/database/models/servers/channel';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {CHANNEL, CHANNEL_MEMBERSHIP}} = MM_TABLES;

export async function handleUserUpdatedEvent(serverUrl: string, msg: any) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }
    const currentUser = await queryCurrentUser(database.database);
    if (!currentUser) {
        return;
    }

    const user: UserProfile = msg.data.user;

    if (user.id === currentUser.id) {
        if (user.update_at > (currentUser?.updateAt || 0)) {
            // Need to request me to make sure we don't override with sanitized fields from the
            // websocket event
            // TODO Potential improvement https://mattermost.atlassian.net/browse/MM-40582
            fetchMe(serverUrl, false);

            // Update GMs display name if locale has changed
            if (user.locale !== currentUser.locale) {
                const channels = await database.database.get<ChannelModel>(CHANNEL).query(
                    Q.where('type', Q.eq(General.GM_CHANNEL))).fetch();
                const {models} = await updateChannelsDisplayName(serverUrl, channels, user, true);
                if (models?.length) {
                    database.operator.batchRecords(models);
                }
            }
        }
    } else {
        database.operator.handleUsers({users: [user], prepareRecordsOnly: false});

        const channels = await database.database.get<ChannelModel>(CHANNEL).query(
            Q.where('type', Q.oneOf([General.DM_CHANNEL, General.GM_CHANNEL])),
            Q.on(CHANNEL_MEMBERSHIP, Q.where('user_id', user.id))).fetch();
        if (!channels?.length) {
            return;
        }

        const {models} = await updateChannelsDisplayName(serverUrl, channels, user, true);

        if (models?.length) {
            database.operator.batchRecords(models);
        }
    }
}

export async function handleUserTypingEvent(serverUrl: string, msg: any) {
    const currentServerUrl = await DatabaseManager.getActiveServerUrl();
    if (currentServerUrl === serverUrl) {
        const database = DatabaseManager.serverDatabases[serverUrl];
        if (!database) {
            return;
        }

        const {config, license} = await queryCommonSystemValues(database.database);

        let user: UserModel | UserProfile | undefined = await queryUserById(database.database, msg.data.user_id);
        if (!user) {
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

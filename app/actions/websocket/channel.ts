// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {localRemoveUserFromChannel, localSetChannelDeleteAt, switchToChannel} from '@actions/local/channel';
import {updateUsersNoLongerVisible} from '@actions/remote/user';
import Events from '@constants/events';
import DatabaseManager from '@database/manager';
import {queryActiveServer} from '@queries/app/servers';
import {deleteChannelMembership, queryCurrentChannel} from '@queries/servers/channel';
import {queryConfig, setCurrentChannelId} from '@queries/servers/system';
import {queryLastChannelFromTeam} from '@queries/servers/team';
import {queryCurrentUser} from '@queries/servers/user';
import {dismissAllModals, popToRoot} from '@screens/navigation';
import {isTablet} from '@utils/helpers';
import {isGuest} from '@utils/user';

export async function handleUserRemovedEvent(serverUrl: string, msg: any) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const channel = await queryCurrentChannel(database.database);
    const user = await queryCurrentUser(database.database);
    if (!user) {
        return;
    }

    if (user.id === msg.data.user_id) {
        localRemoveUserFromChannel(serverUrl, msg.data.channel_id);

        if (isGuest(user.roles)) {
            updateUsersNoLongerVisible(serverUrl);
        }

        if (channel && channel.id === msg.data.channel_id) {
            const currentServer = await queryActiveServer(DatabaseManager.appDatabase!.database);

            if (currentServer?.url === serverUrl) {
                DeviceEventEmitter.emit(Events.LEAVE_CHANNEL);
                await dismissAllModals();
                await popToRoot();

                if (await isTablet()) {
                    const channelToJumpTo = await queryLastChannelFromTeam(database.database, channel?.teamId);
                    if (channelToJumpTo) {
                        switchToChannel(serverUrl, channelToJumpTo);
                    } // TODO else jump to "join a channel" screen
                } else {
                    setCurrentChannelId(database.operator, '');
                }
            }
        }
    } else {
        deleteChannelMembership(database.operator, msg.data.user_id, msg.data.channel_id);
    }
}

export async function handleChannelDeletedEvent(serverUrl: string, msg: any) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const currentChannel = await queryCurrentChannel(database.database);
    const user = await queryCurrentUser(database.database);
    if (!user) {
        return;
    }

    const config = await queryConfig(database.database);

    await localSetChannelDeleteAt(serverUrl, msg.data.channel_id, msg.data.delete_at);

    if (isGuest(user.roles)) {
        updateUsersNoLongerVisible(serverUrl);
    }

    if (config?.ExperimentalViewArchivedChannels !== 'true') {
        localRemoveUserFromChannel(serverUrl, msg.data.channel_id);

        if (currentChannel && currentChannel.id === msg.data.channel_id) {
            const currentServer = await queryActiveServer(DatabaseManager.appDatabase!.database);

            if (currentServer?.url === serverUrl) {
                DeviceEventEmitter.emit(Events.CHANNEL_DELETED);
                await dismissAllModals();
                await popToRoot();

                if (await isTablet()) {
                    const channelToJumpTo = await queryLastChannelFromTeam(database.database, currentChannel?.teamId);
                    if (channelToJumpTo) {
                        switchToChannel(serverUrl, channelToJumpTo);
                    } // TODO else jump to "join a channel" screen
                } else {
                    setCurrentChannelId(database.operator, '');
                }
            }
        }
    }
}

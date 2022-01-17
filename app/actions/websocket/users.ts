// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {updateChannelsDisplayName} from '@actions/local/channel';
import {fetchMe} from '@actions/remote/user';
import {General} from '@constants';
import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {queryCurrentUser} from '@queries/servers/user';

import type ChannelModel from '@typings/database/models/servers/channel';

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

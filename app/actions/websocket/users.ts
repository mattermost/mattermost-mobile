// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model, Q} from '@nozbe/watermelondb';

import {fetchMe} from '@actions/remote/user';
import {General, Preferences} from '@constants';
import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {queryCommonSystemValues} from '@queries/servers/system';
import {queryCurrentUser} from '@queries/servers/user';
import {displayGroupMessageName, displayUsername} from '@utils/user';

import type ChannelModel from '@typings/database/models/servers/channel';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {CHANNEL, CHANNEL_MEMBERSHIP, USER}} = MM_TABLES;

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
                const {config, license} = await queryCommonSystemValues(database.database);
                const preferences = await queryPreferencesByCategoryAndName(database.database, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT);
                const displaySettings = getTeammateNameDisplaySetting(preferences, config, license);
                const models: Model[] = [];
                channels.forEach(async (channel) => {
                    const dbProfiles = await database.database.get<UserModel>(USER).query(Q.on(CHANNEL_MEMBERSHIP, Q.where('channel_id', channel.id))).fetch();
                    const newProfiles: Array<UserModel|UserProfile> = dbProfiles.filter((u) => u.id === user.id);
                    newProfiles.push(user);
                    const newDisplayName = displayGroupMessageName(newProfiles, currentUser.locale, displaySettings, currentUser.id);
                    if (channel.displayName !== newDisplayName) {
                        channel.prepareUpdate((c) => {
                            c.displayName = newDisplayName;
                        });
                    }
                    models.push(channel);
                });
                if (models.length) {
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

        const {config, license} = await queryCommonSystemValues(database.database);
        const preferences = await queryPreferencesByCategoryAndName(database.database, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT);
        const displaySettings = getTeammateNameDisplaySetting(preferences, config, license);
        const models: Model[] = [];
        channels?.forEach(async (channel) => {
            let newDisplayName = '';
            if (channel.type === General.DM_CHANNEL) {
                newDisplayName = displayUsername(user, currentUser.locale, displaySettings);
            } else {
                const dbProfiles = await database.database.get<UserModel>(USER).query(Q.on(CHANNEL_MEMBERSHIP, Q.where('channel_id', channel.id))).fetch();
                const newProfiles: Array<UserModel|UserProfile> = dbProfiles.filter((u) => u.id === user.id);
                newProfiles.push(user);
                newDisplayName = displayGroupMessageName(newProfiles, currentUser.locale, displaySettings, currentUser.id);
            }

            if (channel.displayName !== newDisplayName) {
                channel.prepareUpdate((c) => {
                    c.displayName = newDisplayName;
                });
                models.push(channel);
            }
        });

        if (models.length) {
            database.operator.batchRecords(models);
        }
    }
}

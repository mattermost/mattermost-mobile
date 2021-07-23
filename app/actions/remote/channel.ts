// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';
import {prepareMyChannelsForTeam} from '@queries/servers/channel';
import {displayGroupMessageName, displayUsername} from '@utils/user';

import type {Model} from '@nozbe/watermelondb';

import {forceLogoutIfNecessary} from './session';
import {fetchProfilesPerChannels} from './user';

export type MyChannelsRequest = {
    channels?: Channel[];
    memberships?: ChannelMembership[];
    error?: never;
}

export const fetchMyChannelsForTeam = async (serverUrl: string, teamId: string, includeDeleted = true, since = 0, fetchOnly = false, excludeDirect = false): Promise<MyChannelsRequest> => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        let [channels, memberships] = await Promise.all<Channel[], ChannelMembership[]>([
            client.getMyChannels(teamId, includeDeleted, since),
            client.getMyChannelMembers(teamId),
        ]);

        if (excludeDirect) {
            channels = channels.filter((c) => c.type !== General.GM_CHANNEL && c.type !== General.DM_CHANNEL);
        }

        const channelIds = new Set<string>(channels.map((c) => c.id));
        memberships = memberships.reduce((result: ChannelMembership[], m: ChannelMembership) => {
            if (channelIds.has(m.channel_id)) {
                result.push(m);
            }
            return result;
        }, []);

        if (!fetchOnly) {
            const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
            const modelPromises: Array<Promise<Model[]>> = [];
            if (operator) {
                const prepare = await prepareMyChannelsForTeam(operator, teamId, channels, memberships);
                if (prepare) {
                    modelPromises.push(...prepare);
                }
                if (modelPromises.length) {
                    const models = await Promise.all(modelPromises);
                    const flattenedModels = models.flat() as Model[];
                    if (flattenedModels?.length > 0) {
                        try {
                            await operator.batchRecords(flattenedModels);
                        } catch {
                            // eslint-disable-next-line no-console
                            console.log('FAILED TO BATCH CHANNELS');
                        }
                    }
                }
            }
        }

        return {channels, memberships};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const fetchMissingSidebarInfo = async (serverUrl: string, directChannels: Channel[], locale?: string, teammateDisplayNameSetting?: string, exludeUserId?: string) => {
    const channelIds = directChannels.map((dc) => dc.id);
    const result = await fetchProfilesPerChannels(serverUrl, channelIds, exludeUserId, false);
    if (result.error) {
        return;
    }

    const displayNameByChannel: Record<string, string> = {};

    if (result.data) {
        result.data.forEach((data) => {
            if (data.users) {
                if (data.users.length > 1) {
                    displayNameByChannel[data.channelId] = displayGroupMessageName(data.users, locale, teammateDisplayNameSetting, exludeUserId);
                } else {
                    displayNameByChannel[data.channelId] = displayUsername(data.users[0], locale, teammateDisplayNameSetting);
                }
            }
        });
    }

    directChannels.forEach((c) => {
        const displayName = displayNameByChannel[c.id];
        if (displayName) {
            c.display_name = displayName;
        }
    });

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (operator) {
        operator.handleChannel({channels: directChannels, prepareRecordsOnly: false});
    }
};

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';
import {prepareMyChannelsForTeam, queryMyChannel} from '@queries/servers/channel';
import {displayGroupMessageName, displayUsername} from '@utils/user';

import {fetchRolesIfNeeded} from './role';
import {forceLogoutIfNecessary} from './session';
import {fetchProfilesPerChannels, fetchUsersByIds} from './user';

import type {Client} from '@client/rest';
import type {Model} from '@nozbe/watermelondb';

export type MyChannelsRequest = {
    channels?: Channel[];
    memberships?: ChannelMembership[];
    error?: unknown;
}

export const addMembersToChannel = async (serverUrl: string, channelId: string, userIds: string[], postRootId = '', fetchOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const promises = userIds.map((id) => client.addToChannel(id, channelId, postRootId));
        const channelMemberships: ChannelMembership[] = await Promise.all(promises);
        await fetchUsersByIds(serverUrl, userIds, false);

        if (!fetchOnly) {
            await operator.handleChannelMembership({
                channelMemberships,
                prepareRecordsOnly: false,
            });
        }
        return {channelMemberships};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchChannelByName = async (serverUrl: string, teamId: string, channelName: string, fetchOnly = false) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const channel = await client.getChannelByName(teamId, channelName, true);

        if (!fetchOnly) {
            const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
            if (operator) {
                await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
            }
        }

        return {channel};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchMyChannelsForTeam = async (serverUrl: string, teamId: string, includeDeleted = true, since = 0, fetchOnly = false, excludeDirect = false): Promise<MyChannelsRequest> => {
    let client: Client;
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
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
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

export const joinChannel = async (serverUrl: string, userId: string, teamId: string, channelId?: string, channelName?: string, fetchOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    let member: ChannelMembership | undefined;
    let channel: Channel | undefined;
    try {
        if (channelId) {
            member = await client.addToChannel(userId, channelId);
            channel = await client.getChannel(channelId);
        } else if (channelName) {
            channel = await client.getChannelByName(teamId, channelName, true);
            if ([General.GM_CHANNEL, General.DM_CHANNEL].includes(channel.type)) {
                member = await client.getChannelMember(channel.id, userId);
            } else {
                member = await client.addToChannel(userId, channel.id);
            }
        }
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }

    try {
        if (channel && member && !fetchOnly) {
            fetchRolesIfNeeded(serverUrl, member.roles.split(' '));

            const modelPromises: Array<Promise<Model[]>> = [];
            const prepare = await prepareMyChannelsForTeam(operator, teamId, [channel], [member]);
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
    } catch (error) {
        return {error};
    }

    return {channel, member};
};

export const markChannelAsViewed = async (serverUrl: string, channelId: string, previousChannelId = '', markOnServer = true) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const member = await queryMyChannel(database, channelId);
    const prevMember = await queryMyChannel(database, previousChannelId);
    if (markOnServer) {
        try {
            const client = NetworkManager.getClient(serverUrl);
            client.viewMyChannel(channelId, prevMember?.manuallyUnread ? '' : previousChannelId).catch(() => {
                // do nothing just adding the handler to avoid the warning
            });
        } catch (error) {
            return {error};
        }
    }

    const models = [];
    const lastViewedAt = Date.now();
    if (member) {
        member.prepareUpdate((m) => {
            m.messageCount = 0;
            m.mentionsCount = 0;
            m.manuallyUnread = false;
            m.lastViewedAt = lastViewedAt;
        });

        models.push(member);
    }

    if (prevMember && !prevMember.manuallyUnread) {
        prevMember.prepareUpdate((m) => {
            m.messageCount = 0;
            m.mentionsCount = 0;
            m.manuallyUnread = false;
            m.lastViewedAt = lastViewedAt;
        });

        models.push(prevMember);
    }

    try {
        if (models.length) {
            const {operator} = DatabaseManager.serverDatabases[serverUrl];
            await operator.batchRecords(models);
        }

        return {data: true};
    } catch (error) {
        return {error};
    }
};

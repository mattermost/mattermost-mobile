// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {IntlShape} from 'react-intl';

import {switchToChannel} from '@actions/local/channel';
import {General} from '@constants';
import DatabaseManager from '@database/manager';
import {privateChannelJoinPrompt} from '@helpers/api/channel';
import NetworkManager from '@init/network_manager';
import {prepareMyChannelsForTeam, queryMyChannel} from '@queries/servers/channel';
import {queryCommonSystemValues} from '@queries/servers/system';
import {prepareMyTeams, queryMyTeamById, queryTeamById, queryTeamByName} from '@queries/servers/team';
import MyChannelModel from '@typings/database/models/servers/my_channel';
import MyTeamModel from '@typings/database/models/servers/my_team';
import TeamModel from '@typings/database/models/servers/team';
import {PERMALINK_GENERIC_TEAM_NAME_REDIRECT} from '@utils/url';
import {displayGroupMessageName, displayUsername} from '@utils/user';

import {fetchRolesIfNeeded} from './role';
import {forceLogoutIfNecessary} from './session';
import {addUserToTeam, fetchTeamByName, removeUserFromTeam} from './team';
import {fetchProfilesPerChannels, fetchUsersByIds} from './user';

import type {Client} from '@client/rest';

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

export const fetchMyChannel = async (serverUrl: string, teamId: string, channelId: string, fetchOnly = false): Promise<MyChannelsRequest> => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const [channel, member] = await Promise.all([
            client.getChannel(channelId),
            client.getChannelMember(channelId, 'me'),
        ]);

        if (!fetchOnly) {
            const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
            const modelPromises: Array<Promise<Model[]>> = [];
            if (operator) {
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
        }

        return {
            channels: [channel],
            memberships: [member],
        };
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchMissingSidebarInfo = async (serverUrl: string, directChannels: Channel[], locale?: string, teammateDisplayNameSetting?: string, exludeUserId?: string, fetchOnly = false) => {
    const channelIds = directChannels.map((dc) => dc.id);
    const result = await fetchProfilesPerChannels(serverUrl, channelIds, exludeUserId, false);
    if (result.error) {
        return {error: result.error};
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

    if (!fetchOnly) {
        const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
        if (operator) {
            await operator.handleChannel({channels: directChannels, prepareRecordsOnly: false});
        }
    }

    return {directChannels};
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

export const markChannelAsRead = async (serverUrl: string, channelId: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.viewMyChannel(channelId);

        return {};
    } catch (error) {
        return {error};
    }
};

export const switchToChannelByName = async (serverUrl: string, channelName: string, teamName: string, errorHandler: (intl: IntlShape) => void, intl: IntlShape) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        let myChannel: MyChannelModel | ChannelMembership | undefined;
        let team: TeamModel | Team | undefined;
        let myTeam: MyTeamModel | TeamMembership | undefined;
        let name = teamName;
        const roles: string [] = [];
        const system = await queryCommonSystemValues(database);
        const currentTeam = await queryTeamById(database, system.currentTeamId);

        if (name === PERMALINK_GENERIC_TEAM_NAME_REDIRECT) {
            name = currentTeam!.name;
        } else {
            team = await queryTeamByName(database, teamName);
        }

        if (!team) {
            const fetchTeam = await fetchTeamByName(serverUrl, name, true);
            if (fetchTeam.error) {
                errorHandler(intl);
                return {error: fetchTeam.error};
            }

            team = fetchTeam.team!;
        }

        let joinedNewTeam = false;
        myTeam = await queryMyTeamById(database, team.id);
        if (!myTeam) {
            const added = await addUserToTeam(serverUrl, team.id, system.currentUserId, true);
            if (added.error) {
                errorHandler(intl);
                return {error: added.error};
            }
            myTeam = added.member!;
            roles.push(...myTeam.roles.split(' '));
            joinedNewTeam = true;
        }

        if (!myTeam) {
            errorHandler(intl);
            return {error: 'Could not fetch team member'};
        }

        let isArchived = false;
        const chReq = await fetchChannelByName(serverUrl, team.id, channelName);
        if (chReq.error) {
            errorHandler(intl);
            return {error: chReq.error};
        }
        const channel = chReq.channel;
        if (!channel) {
            errorHandler(intl);
            return {error: 'Could not fetch channel'};
        }

        isArchived = channel.delete_at > 0;
        if (isArchived && system.config.ExperimentalViewArchivedChannels !== 'true') {
            errorHandler(intl);
            return {error: 'Channel is archived'};
        }

        myChannel = await queryMyChannel(database, channel.id);

        if (!myChannel) {
            if (channel.type === General.PRIVATE_CHANNEL) {
                const displayName = channel.display_name;
                const {join} = await privateChannelJoinPrompt(displayName, intl);
                if (!join) {
                    if (joinedNewTeam) {
                        await removeUserFromTeam(serverUrl, team.id, system.currentUserId, true);
                    }
                    errorHandler(intl);
                    return {error: 'Refused to join Private channel'};
                }
                console.log('joining channel', displayName, channel.id); //eslint-disable-line
                const result = await joinChannel(serverUrl, system.currentUserId, team.id, channel.id, undefined, true);
                if (result.error || !result.channel) {
                    if (joinedNewTeam) {
                        await removeUserFromTeam(serverUrl, team.id, system.currentUserId, true);
                    }

                    errorHandler(intl);
                    return {error: result.error};
                }

                myChannel = result.member!;
                roles.push(...myChannel.roles.split(' '));
            }
        }

        if (!myChannel) {
            errorHandler(intl);
            return {error: 'could not fetch channel member'};
        }

        const modelPromises: Array<Promise<Model[]>> = [];
        const {operator} = DatabaseManager.serverDatabases[serverUrl];
        if (!(team instanceof Model)) {
            const prepT = prepareMyTeams(operator, [team], [(myTeam as TeamMembership)]);
            if (prepT) {
                modelPromises.push(...prepT);
            }
        } else if (!(myTeam instanceof Model)) {
            const mt: MyTeam[] = [{
                id: myTeam.team_id,
                roles: myTeam.roles,
            }];
            modelPromises.push(
                operator.handleMyTeam({myTeams: mt, prepareRecordsOnly: true}),
                operator.handleTeamMemberships({teamMemberships: [myTeam], prepareRecordsOnly: true}),
            );
        }

        if (!(myChannel instanceof Model)) {
            const prepCh = await prepareMyChannelsForTeam(operator, team.id, [channel], [myChannel]);
            if (prepCh) {
                modelPromises.push(...prepCh);
            }
        }

        let teamId;
        if (team.id !== system.currentTeamId) {
            teamId = team.id;
        }

        let channelId;
        if (channel.id !== system.currentChannelId) {
            channelId = channel.id;
        }

        if (modelPromises.length) {
            const models = await Promise.all(modelPromises);
            await operator.batchRecords(models.flat());
        }

        if (teamId) {
            fetchMyChannelsForTeam(serverUrl, teamId, true, 0, false, true);
        }

        if (teamId && channelId) {
            await switchToChannel(serverUrl, channelId, teamId);
        }

        if (roles.length) {
            fetchRolesIfNeeded(serverUrl, roles);
        }

        return {error: undefined};
    } catch (error) {
        errorHandler(intl);
        return {error};
    }
};

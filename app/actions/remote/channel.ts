// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */
import {Model} from '@nozbe/watermelondb';
import {IntlShape} from 'react-intl';

import {storeCategories} from '@actions/local/category';
import {storeMyChannelsForTeam, switchToChannel} from '@actions/local/channel';
import {General, Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {privateChannelJoinPrompt} from '@helpers/api/channel';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';
import NetworkManager from '@init/network_manager';
import {prepareMyChannelsForTeam, getChannelById, getChannelByName, getMyChannel} from '@queries/servers/channel';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {getCommonSystemValues, getCurrentTeamId, getCurrentUserId} from '@queries/servers/system';
import {prepareMyTeams, getNthLastChannelFromTeam, getMyTeamById, getTeamById, getTeamByName} from '@queries/servers/team';
import {getCurrentUser} from '@queries/servers/user';
import {getDirectChannelName} from '@utils/channel';
import {PERMALINK_GENERIC_TEAM_NAME_REDIRECT} from '@utils/url';
import {displayGroupMessageName, displayUsername} from '@utils/user';

import {fetchPostsForChannel} from './post';
import {fetchRolesIfNeeded} from './role';
import {forceLogoutIfNecessary} from './session';
import {addUserToTeam, fetchTeamByName, removeUserFromTeam} from './team';
import {fetchProfilesPerChannels, fetchUsersByIds} from './user';

import type {Client} from '@client/rest';
import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type MyTeamModel from '@typings/database/models/servers/my_team';
import type TeamModel from '@typings/database/models/servers/team';

export type MyChannelsRequest = {
    categories?: CategoryWithChannels[];
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
        const {users} = await fetchUsersByIds(serverUrl, userIds, true);

        if (!fetchOnly) {
            const modelPromises: Array<Promise<Model[]>> = [];
            if (users) {
                modelPromises.push(operator.handleUsers({
                    users,
                    prepareRecordsOnly: true,
                }));
            }
            modelPromises.push(operator.handleChannelMembership({
                channelMemberships,
                prepareRecordsOnly: true,
            }));

            const models = await Promise.all(modelPromises);
            await operator.batchRecords(models.flat());
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

export const fetchChannelCreator = async (serverUrl: string, channelId: string, fetchOnly = false) => {
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
        const currentUserId = await getCurrentUserId(operator.database);
        const channel = await getChannelById(operator.database, channelId);
        if (channel && channel.creatorId) {
            const user = await client.getUser(channel.creatorId);

            if (!fetchOnly) {
                const modelPromises: Array<Promise<Model[]>> = [];
                if (user.id !== currentUserId) {
                    modelPromises.push(operator.handleUsers({
                        users: [user],
                        prepareRecordsOnly: true,
                    }));
                }

                modelPromises.push(operator.handleChannelMembership({
                    channelMemberships: [{channel_id: channelId, user_id: channel.creatorId}],
                    prepareRecordsOnly: true,
                }));

                const models = await Promise.all(modelPromises);
                await operator.batchRecords(models.flat());
            }

            return {user};
        }

        return {user: undefined};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchChannelStats = async (serverUrl: string, channelId: string, fetchOnly = false) => {
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
        const stats = await client.getChannelStats(channelId);
        if (!fetchOnly) {
            const channel = await getChannelById(operator.database, channelId);
            if (channel) {
                const channelInfo = await channel.info.fetch() as ChannelInfoModel;
                const channelInfos: ChannelInfo[] = [{
                    guest_count: stats.guest_count,
                    header: channelInfo.header,
                    id: channelId,
                    member_count: stats.member_count,
                    pinned_post_count: stats.pinnedpost_count,
                    purpose: channelInfo.purpose,
                }];
                await operator.handleChannelInfo({channelInfos, prepareRecordsOnly: false});
            }
        }

        return {stats};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchMyChannelsForTeam = async (serverUrl: string, teamId: string, includeDeleted = true, since = 0, fetchOnly = false, excludeDirect = false): Promise<MyChannelsRequest> => {
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
        const [allChannels, channelMemberships, categoriesWithOrder] = await Promise.all([
            client.getMyChannels(teamId, includeDeleted, since),
            client.getMyChannelMembers(teamId),
            client.getCategories('me', teamId),
        ]);

        let channels = allChannels;
        let memberships = channelMemberships;
        if (excludeDirect) {
            channels = channels.filter((c) => c.type !== General.GM_CHANNEL && c.type !== General.DM_CHANNEL);
        }

        const channelIds = new Set<string>(channels.map((c) => c.id));
        const {categories} = categoriesWithOrder;
        memberships = memberships.reduce((result: ChannelMembership[], m: ChannelMembership) => {
            if (channelIds.has(m.channel_id)) {
                result.push(m);
            }
            return result;
        }, []);

        if (!fetchOnly) {
            const {models: chModels} = await storeMyChannelsForTeam(serverUrl, teamId, channels, memberships, true);
            const {models: catModels} = await storeCategories(serverUrl, categories, true, true); // Re-sync
            const models = (chModels || []).concat(catModels || []);
            if (models.length) {
                await operator.batchRecords(models);
            }
        }

        return {channels, memberships, categories};
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
            storeMyChannelsForTeam(serverUrl, channel.team_id || teamId, [channel], [member]);
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

export const fetchMissingSidebarInfo = async (serverUrl: string, directChannels: Channel[], locale?: string, teammateDisplayNameSetting?: string, currentUserId?: string, fetchOnly = false) => {
    const channelIds = directChannels.sort((a, b) => b.last_post_at - a.last_post_at).map((dc) => dc.id);
    const result = await fetchProfilesPerChannels(serverUrl, channelIds, currentUserId, false);
    if (result.error) {
        return {error: result.error};
    }

    const displayNameByChannel: Record<string, string> = {};

    if (result.data) {
        result.data.forEach((data) => {
            if (data.users) {
                if (data.users.length > 1) {
                    displayNameByChannel[data.channelId] = displayGroupMessageName(data.users, locale, teammateDisplayNameSetting, currentUserId);
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

    if (currentUserId) {
        const ownDirectChannel = directChannels.find((dm) => dm.name === getDirectChannelName(currentUserId, currentUserId));
        const database = DatabaseManager.serverDatabases[serverUrl]?.database;
        if (ownDirectChannel && database) {
            const currentUser = await getCurrentUser(database);
            ownDirectChannel.display_name = displayUsername(currentUser, locale, teammateDisplayNameSetting);
        }
    }

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
            const directTypes: string[] = [General.GM_CHANNEL, General.DM_CHANNEL];
            if (directTypes.includes(channel.type)) {
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
        const system = await getCommonSystemValues(database);
        const currentTeam = await getTeamById(database, system.currentTeamId);

        if (name === PERMALINK_GENERIC_TEAM_NAME_REDIRECT) {
            name = currentTeam!.name;
        } else {
            team = await getTeamByName(database, teamName);
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
        myTeam = await getMyTeamById(database, team.id);
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

        myChannel = await getMyChannel(database, channel.id);

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
            await switchToChannelById(serverUrl, channelId, teamId);
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

export const createDirectChannel = async (serverUrl: string, userId: string, displayName = '') => {
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
        const currentUser = await getCurrentUser(operator.database);
        if (!currentUser) {
            return {error: 'Cannot get the current user'};
        }
        const created = await client.createDirectChannel([userId, currentUser.id]);

        if (displayName) {
            created.display_name = displayName;
        } else {
            const preferences = await queryPreferencesByCategoryAndName(operator.database, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT).fetch();
            const system = await getCommonSystemValues(operator.database);
            const teammateDisplayNameSetting = getTeammateNameDisplaySetting(preferences || [], system.config, system.license);
            const {directChannels} = await fetchMissingSidebarInfo(serverUrl, [created], currentUser.locale, teammateDisplayNameSetting, currentUser.id, true);
            created.display_name = directChannels?.[0].display_name || created.display_name;
        }

        const member = {
            channel_id: created.id,
            user_id: currentUser.id,
            roles: `${General.CHANNEL_USER_ROLE}`,
            last_viewed_at: 0,
            msg_count: 0,
            mention_count: 0,
            msg_count_root: 0,
            mention_count_root: 0,
            notify_props: {desktop: 'default' as const, mark_unread: 'all' as const},
            last_update_at: created.create_at,
        };

        const models = [];
        const channelPromises = await prepareMyChannelsForTeam(operator, '', [created], [member, {...member, user_id: userId}]);
        if (channelPromises) {
            const channelModels = await Promise.all(channelPromises);
            const flattenedChannelModels = channelModels.flat();
            if (flattenedChannelModels.length) {
                models.push(...flattenedChannelModels);
            }
        }

        if (models.length) {
            await operator.batchRecords(models);
        }
        fetchRolesIfNeeded(serverUrl, member.roles.split(' '));
        return {data: created};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};
export const fetchChannels = async (serverUrl: string, teamId: string, page = 0, perPage: number = General.CHANNELS_CHUNK_SIZE) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const channels = await client.getChannels(teamId, page, perPage);

        return {channels};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const makeDirectChannel = async (serverUrl: string, userId: string, displayName = '', shouldSwitchToChannel = true) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const currentUserId = await getCurrentUserId(operator.database);
        const channelName = getDirectChannelName(userId, currentUserId);
        let channel: Channel|ChannelModel|undefined = await getChannelByName(operator.database, channelName);
        let result: {data?: Channel|ChannelModel; error?: any};
        if (channel) {
            result = {data: channel};
        } else {
            result = await createDirectChannel(serverUrl, userId, displayName);
            channel = result.data;
        }

        if (channel && shouldSwitchToChannel) {
            switchToChannelById(serverUrl, channel.id);
        }

        return result;
    } catch (error) {
        return {error};
    }
};
export const fetchArchivedChannels = async (serverUrl: string, teamId: string, page = 0, perPage: number = General.CHANNELS_CHUNK_SIZE) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const channels = await client.getArchivedChannels(teamId, page, perPage);

        return {channels};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const createGroupChannel = async (serverUrl: string, userIds: string[]) => {
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
        const currentUser = await getCurrentUser(operator.database);
        if (!currentUser) {
            return {error: 'Cannot get the current user'};
        }
        const created = await client.createGroupChannel(userIds);

        // Check the channel previous existency: if the channel already have
        // posts is because it existed before.
        if (created.total_msg_count > 0) {
            return {data: created};
        }

        const preferences = await queryPreferencesByCategoryAndName(operator.database, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT).fetch();
        const system = await getCommonSystemValues(operator.database);
        const teammateDisplayNameSetting = getTeammateNameDisplaySetting(preferences || [], system.config, system.license);
        const {directChannels} = await fetchMissingSidebarInfo(serverUrl, [created], currentUser.locale, teammateDisplayNameSetting, currentUser.id, true);

        const member = {
            channel_id: created.id,
            user_id: '',
            roles: `${General.CHANNEL_USER_ROLE}`,
            last_viewed_at: 0,
            msg_count: 0,
            mention_count: 0,
            msg_count_root: 0,
            mention_count_root: 0,
            notify_props: {desktop: 'default' as const, mark_unread: 'all' as const},
            last_update_at: created.create_at,
        };

        const members = userIds.map((id) => {
            return {...member, user_id: id};
        });

        if (directChannels?.length) {
            const channelPromises = await prepareMyChannelsForTeam(operator, '', directChannels, members);
            if (channelPromises) {
                const channelModels = await Promise.all(channelPromises);
                const flattenedChannelModels = channelModels.flat();
                if (flattenedChannelModels.length) {
                    operator.batchRecords(flattenedChannelModels);
                }
            }
        }
        fetchRolesIfNeeded(serverUrl, member.roles.split(' '));
        return {data: created};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};
export const fetchSharedChannels = async (serverUrl: string, teamId: string, page = 0, perPage: number = General.CHANNELS_CHUNK_SIZE) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }
    try {
        const channels = await client.getSharedChannels(teamId, page, perPage);

        return {channels};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const makeGroupChannel = async (serverUrl: string, userIds: string[], shouldSwitchToChannel = true) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const currentUserId = await getCurrentUserId(operator.database);
        const result = await createGroupChannel(serverUrl, [currentUserId, ...userIds]);
        const channel = result.data;

        if (channel && shouldSwitchToChannel) {
            switchToChannelById(serverUrl, channel.id);
        }

        return result;
    } catch (error) {
        return {error};
    }
};
export async function getChannelMemberCountsByGroup(serverUrl: string, channelId: string, includeTimezones: boolean) {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const channelMemberCountsByGroup = await client.getChannelMemberCountsByGroup(channelId, includeTimezones);
        return {channelMemberCountsByGroup};
    } catch (error) {
        return {error};
    }
}

export async function getChannelTimezones(serverUrl: string, channelId: string) {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const channelTimezones = await client.getChannelTimezones(channelId);
        return {channelTimezones};
    } catch (error) {
        return {error};
    }
}

export async function getOrCreateDirectChannel(serverUrl: string, otherUserId: string, shouldSwitchToChannel = true) {
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

    const currentUserId = await getCurrentUserId(operator.database);
    const channelName = getDirectChannelName(currentUserId, otherUserId);

    const channel = await getChannelByName(operator.database, channelName);
    let result;
    if (channel) {
        result = {channel};
    } else {
        try {
            const newChannel = await client.createDirectChannel([currentUserId, otherUserId]);
            result = {channel: newChannel};

            const member = await client.getMyChannelMember(newChannel.id);

            const modelPromises: Array<Promise<Model[]>> = [];
            const prepare = await prepareMyChannelsForTeam(operator, '', [newChannel], [member]);
            if (prepare?.length) {
                modelPromises.push(...prepare);
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
        } catch (error) {
            return {error};
        }
    }

    if (shouldSwitchToChannel) {
        switchToChannelById(serverUrl, result.channel.id);
    }

    return result;
}

export const switchToChannelById = async (serverUrl: string, channelId: string, teamId?: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    fetchPostsForChannel(serverUrl, channelId);
    await switchToChannel(serverUrl, channelId, teamId);
    markChannelAsRead(serverUrl, channelId);
    fetchChannelStats(serverUrl, channelId);

    return {};
};

export const switchToPenultimateChannel = async (serverUrl: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const currentTeam = await getCurrentTeamId(database);
        const channelId = await getNthLastChannelFromTeam(database, currentTeam, 1);
        return switchToChannelById(serverUrl, channelId);
    } catch (error) {
        return {error};
    }
};

export const searchChannels = async (serverUrl: string, term: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const currentTeamId = await getCurrentTeamId(database);
        const channels = await client.autocompleteChannels(currentTeamId, term);
        return {channels};
    } catch (error) {
        return {error};
    }
};

export const fetchChannelById = async (serverUrl: string, id: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const channel = await client.getChannel(id);
        return {channel};
    } catch (error) {
        return {error};
    }
};

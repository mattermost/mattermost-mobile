// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */
import {Model} from '@nozbe/watermelondb';
import {IntlShape} from 'react-intl';

import {addChannelToDefaultCategory, storeCategories} from '@actions/local/category';
import {removeCurrentUserFromChannel, setChannelDeleteAt, storeMyChannelsForTeam, switchToChannel} from '@actions/local/channel';
import {switchToGlobalThreads} from '@actions/local/thread';
import {General, Preferences, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {privateChannelJoinPrompt} from '@helpers/api/channel';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';
import NetworkManager from '@managers/network_manager';
import {prepareMyChannelsForTeam, getChannelById, getChannelByName, getMyChannel, getChannelInfo, queryMyChannelSettingsByIds} from '@queries/servers/channel';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {getCommonSystemValues, getConfig, getCurrentTeamId, getCurrentUserId, getLicense, setCurrentChannelId} from '@queries/servers/system';
import {prepareMyTeams, getNthLastChannelFromTeam, getMyTeamById, getTeamById, getTeamByName, queryMyTeams} from '@queries/servers/team';
import {getCurrentUser} from '@queries/servers/user';
import EphemeralStore from '@store/ephemeral_store';
import {generateChannelNameFromDisplayName, getDirectChannelName, isDMorGM} from '@utils/channel';
import {isTablet} from '@utils/helpers';
import {showMuteChannelSnackbar} from '@utils/snack_bar';
import {PERMALINK_GENERIC_TEAM_NAME_REDIRECT} from '@utils/url';
import {displayGroupMessageName, displayUsername} from '@utils/user';

import {fetchPostsForChannel} from './post';
import {setDirectChannelVisible} from './preference';
import {fetchRolesIfNeeded} from './role';
import {forceLogoutIfNecessary} from './session';
import {addUserToTeam, fetchTeamByName, removeUserFromTeam} from './team';
import {fetchProfilesInGroupChannels, fetchProfilesPerChannels, fetchUsersByIds, updateUsersNoLongerVisible} from './user';

import type {Client} from '@client/rest';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type MyTeamModel from '@typings/database/models/servers/my_team';
import type TeamModel from '@typings/database/models/servers/team';

export type MyChannelsRequest = {
    categories?: CategoryWithChannels[];
    channels?: Channel[];
    memberships?: ChannelMembership[];
    error?: unknown;
}

export async function addMembersToChannel(serverUrl: string, channelId: string, userIds: string[], postRootId = '', fetchOnly = false) {
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
            modelPromises.push(operator.handleUsers({
                users,
                prepareRecordsOnly: true,
            }));
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
}

export async function fetchChannelByName(serverUrl: string, teamId: string, channelName: string, fetchOnly = false) {
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
}

export async function createChannel(serverUrl: string, displayName: string, purpose: string, header: string, type: ChannelType) {
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
        const {database} = operator;
        const {currentUserId, currentTeamId} = await getCommonSystemValues(database);
        const name = generateChannelNameFromDisplayName(displayName);
        const channel = {
            creator_id: currentUserId,
            team_id: currentTeamId,
            display_name: displayName,
            header,
            name,
            purpose,
            type,
        } as Channel;

        EphemeralStore.creatingChannel = true;
        const channelData = await client.createChannel(channel);

        const member = await client.getChannelMember(channelData.id, currentUserId);

        const models: Model[] = [];
        const channelModels = await prepareMyChannelsForTeam(operator, channelData.team_id, [channelData], [member]);
        if (channelModels.length) {
            const resolvedModels = await Promise.all(channelModels);
            models.push(...resolvedModels.flat());
        }
        const categoriesModels = await addChannelToDefaultCategory(serverUrl, channelData, true);
        if (categoriesModels.models?.length) {
            models.push(...categoriesModels.models);
        }
        if (models.length) {
            await operator.batchRecords(models);
        }
        fetchChannelStats(serverUrl, channelData.id, false);
        EphemeralStore.creatingChannel = false;
        return {channel: channelData};
    } catch (error) {
        EphemeralStore.creatingChannel = false;
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
}

export async function patchChannel(serverUrl: string, channelPatch: Partial<Channel> & {id: string}) {
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
        const channelData = await client.patchChannel(channelPatch.id, channelPatch);
        const models = [];
        const channelInfo = (await getChannelInfo(operator.database, channelData.id));
        if (channelInfo && (channelInfo.purpose !== channelData.purpose || channelInfo.header !== channelData.header)) {
            channelInfo.prepareUpdate((v) => {
                v.purpose = channelData.purpose;
                v.header = channelData.header;
            });
            models.push(channelInfo);
        }
        const channel = await getChannelById(operator.database, channelData.id);
        if (channel && (channel.displayName !== channelData.display_name || channel.type !== channelData.type)) {
            channel.prepareUpdate((v) => {
                v.displayName = channelData.display_name;
                v.type = channelData.type;
            });
            models.push(channel);
        }
        if (models?.length) {
            await operator.batchRecords(models.flat());
        }
        return {channel: channelData};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
}

export async function leaveChannel(serverUrl: string, channelId: string) {
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
        const {database} = operator;
        const isTabletDevice = await isTablet();
        const user = await getCurrentUser(database);
        const models: Model[] = [];

        if (!user) {
            return {error: 'current user not found'};
        }

        EphemeralStore.addLeavingChannel(channelId);
        await client.removeFromChannel(user.id, channelId);

        if (user.isGuest) {
            const {models: updateVisibleModels} = await updateUsersNoLongerVisible(serverUrl, true);
            if (updateVisibleModels) {
                models.push(...updateVisibleModels);
            }
        }

        const {models: removeUserModels} = await removeCurrentUserFromChannel(serverUrl, channelId, true);
        if (removeUserModels) {
            models.push(...removeUserModels);
        }

        await operator.batchRecords(models);

        if (isTabletDevice) {
            switchToLastChannel(serverUrl);
        } else {
            setCurrentChannelId(operator, '');
        }
        return {error: undefined};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    } finally {
        EphemeralStore.removeLeavingChannel(channelId);
    }
}

export async function fetchChannelCreator(serverUrl: string, channelId: string, fetchOnly = false) {
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
}

export async function fetchChannelStats(serverUrl: string, channelId: string, fetchOnly = false) {
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
                const channelInfos: Array<Partial<ChannelInfo>> = [{
                    guest_count: stats.guest_count,
                    id: channelId,
                    member_count: stats.member_count,
                    pinned_post_count: stats.pinnedpost_count,
                }];
                await operator.handleChannelInfo({channelInfos, prepareRecordsOnly: false});
            }
        }

        return {stats};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
}

export async function fetchMyChannelsForTeam(serverUrl: string, teamId: string, includeDeleted = true, since = 0, fetchOnly = false, excludeDirect = false, isCRTEnabled?: boolean): Promise<MyChannelsRequest> {
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
            channels = channels.filter((c) => !isDMorGM(c));
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
            const {models: chModels} = await storeMyChannelsForTeam(serverUrl, teamId, channels, memberships, true, isCRTEnabled);
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
}

export async function fetchMyChannel(serverUrl: string, teamId: string, channelId: string, fetchOnly = false): Promise<MyChannelsRequest> {
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
        const [channel, member] = await Promise.all([
            client.getChannel(channelId),
            client.getChannelMember(channelId, 'me'),
        ]);

        if (!fetchOnly) {
            await storeMyChannelsForTeam(serverUrl, channel.team_id || teamId, [channel], [member]);
        }

        return {
            channels: [channel],
            memberships: [member],
        };
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
}

export async function fetchMissingDirectChannelsInfo(serverUrl: string, directChannels: Channel[], locale?: string, teammateDisplayNameSetting?: string, currentUserId?: string, fetchOnly = false) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const {database} = operator;
    const displayNameByChannel: Record<string, string> = {};
    const users: UserProfile[] = [];
    const updatedChannels = new Set<Channel>();

    const dms: Channel[] = [];
    const gms: Channel[] = [];
    for (const c of directChannels) {
        if (c.type === General.DM_CHANNEL) {
            dms.push(c);
            continue;
        }
        gms.push(c);
    }

    try {
        const currentUser = await getCurrentUser(database);
        const results = await Promise.all([
            fetchProfilesPerChannels(serverUrl, dms.map((c) => c.id), currentUserId, false),
            fetchProfilesInGroupChannels(serverUrl, gms.map((c) => c.id), false),
        ]);

        const profileRequests = results.flat();
        for (const result of profileRequests) {
            result.data?.forEach((data) => {
                if (data.users?.length) {
                    users.push(...data.users);
                    if (data.users.length > 1) {
                        displayNameByChannel[data.channelId] = displayGroupMessageName(data.users, locale, teammateDisplayNameSetting, currentUserId);
                    } else {
                        displayNameByChannel[data.channelId] = displayUsername(data.users[0], locale, teammateDisplayNameSetting, false);
                    }
                }
            });

            directChannels.forEach((c) => {
                const displayName = displayNameByChannel[c.id];
                if (displayName) {
                    c.display_name = displayName;
                    c.fake = true;
                    updatedChannels.add(c);
                }
            });

            if (currentUserId) {
                const ownDirectChannel = dms.find((dm) => dm.name === getDirectChannelName(currentUserId, currentUserId));
                if (ownDirectChannel) {
                    ownDirectChannel.display_name = displayUsername(currentUser, locale, teammateDisplayNameSetting, false);
                    updatedChannels.add(ownDirectChannel);
                }
            }
        }

        const updatedChannelsArray = Array.from(updatedChannels);
        if (!fetchOnly) {
            const modelPromises: Array<Promise<Model[]>> = [];
            if (updatedChannelsArray.length) {
                modelPromises.push(operator.handleChannel({channels: updatedChannelsArray, prepareRecordsOnly: true}));
            }

            const models = await Promise.all(modelPromises);
            await operator.batchRecords(models.flat());
        }

        return {directChannels: updatedChannelsArray, users};
    } catch (error) {
        return {error};
    }
}

export async function fetchDirectChannelsInfo(serverUrl: string, directChannels: ChannelModel[]) {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const preferences = await queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DISPLAY_SETTINGS).fetch();
    const config = await getConfig(database);
    const license = await getLicense(database);
    const teammateDisplayNameSetting = getTeammateNameDisplaySetting(preferences, config, license);
    const currentUser = await getCurrentUser(database);
    const channels = directChannels.map((d) => d.toApi());
    return fetchMissingDirectChannelsInfo(serverUrl, channels, currentUser?.locale, teammateDisplayNameSetting, currentUser?.id);
}

export async function joinChannel(serverUrl: string, userId: string, teamId: string, channelId?: string, channelName?: string, fetchOnly = false) {
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
            EphemeralStore.addJoiningChannel(channelId);
            member = await client.addToChannel(userId, channelId);
            channel = await client.getChannel(channelId);
        } else if (channelName) {
            channel = await client.getChannelByName(teamId, channelName, true);
            EphemeralStore.addJoiningChannel(channel.id);
            if (isDMorGM(channel)) {
                member = await client.getChannelMember(channel.id, userId);
            } else {
                member = await client.addToChannel(userId, channel.id);
            }
        }
    } catch (error) {
        if (channelId || channel?.id) {
            EphemeralStore.removeJoiningChannel(channelId || channel!.id);
        }
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }

    try {
        if (channel && member && !fetchOnly) {
            fetchRolesIfNeeded(serverUrl, member.roles.split(' '));

            const modelPromises: Array<Promise<Model[]>> = await prepareMyChannelsForTeam(operator, teamId, [channel], [member]);
            if (modelPromises.length) {
                const models = await Promise.all(modelPromises);
                const flattenedModels: Model[] = models.flat();
                const categoriesModels = await addChannelToDefaultCategory(serverUrl, channel, true);
                if (categoriesModels.models?.length) {
                    flattenedModels.push(...categoriesModels.models);
                }
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
        if (channelId || channel?.id) {
            EphemeralStore.removeJoiningChannel(channelId || channel!.id);
        }
        return {error};
    }

    if (channelId || channel?.id) {
        EphemeralStore.removeJoiningChannel(channelId || channel!.id);
    }
    return {channel, member};
}

export async function joinChannelIfNeeded(serverUrl: string, channelId: string) {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const myChannel = await getMyChannel(database, channelId);
        if (myChannel) {
            return {error: undefined};
        }

        const userId = await getCurrentUserId(database);
        return joinChannel(serverUrl, userId, '', channelId);
    } catch (error) {
        return {error};
    }
}

export async function markChannelAsRead(serverUrl: string, channelId: string) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.viewMyChannel(channelId);

        return {};
    } catch (error) {
        return {error};
    }
}

export async function switchToChannelByName(serverUrl: string, channelName: string, teamName: string, errorHandler: (intl: IntlShape) => void, intl: IntlShape) {
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
        const chReq = await fetchChannelByName(serverUrl, team.id, channelName, true);
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
            const req = await fetchMyChannel(serverUrl, channel.team_id || team.id, channel.id, true);
            myChannel = req.memberships?.[0];
        }

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
            modelPromises.push(...prepareMyTeams(operator, [team], [(myTeam as TeamMembership)]));
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
            modelPromises.push(...await prepareMyChannelsForTeam(operator, team.id, [channel], [myChannel]));
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

        if (teamId || channelId) {
            await switchToChannelById(serverUrl, channel.id, team.id);
        }

        if (roles.length) {
            fetchRolesIfNeeded(serverUrl, roles);
        }

        return {error: undefined};
    } catch (error) {
        errorHandler(intl);
        return {error};
    }
}

export async function createDirectChannel(serverUrl: string, userId: string, displayName = '') {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const {database} = operator;

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const currentUser = await getCurrentUser(database);
        if (!currentUser) {
            return {error: 'Cannot get the current user'};
        }

        const channelName = getDirectChannelName(currentUser.id, userId);
        const channel = await getChannelByName(database, channelName);
        if (channel) {
            return {data: channel.toApi()};
        }

        EphemeralStore.creatingDMorGMTeammates = [userId];
        const created = await client.createDirectChannel([userId, currentUser.id]);
        const profiles: UserProfile[] = [];

        if (displayName) {
            created.display_name = displayName;
        } else {
            const preferences = await queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT).fetch();
            const system = await getCommonSystemValues(database);
            const teammateDisplayNameSetting = getTeammateNameDisplaySetting(preferences || [], system.config, system.license);
            const {directChannels, users} = await fetchMissingDirectChannelsInfo(serverUrl, [created], currentUser.locale, teammateDisplayNameSetting, currentUser.id, true);
            created.display_name = directChannels?.[0].display_name || created.display_name;
            if (users?.length) {
                profiles.push(...users);
            }
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
        if (channelPromises.length) {
            const channelModels = await Promise.all(channelPromises);
            const flattenedChannelModels = channelModels.flat();
            if (flattenedChannelModels.length) {
                models.push(...flattenedChannelModels);
            }
            const categoryModels = await addChannelToDefaultCategory(serverUrl, created, true);
            if (categoryModels.models?.length) {
                models.push(...categoryModels.models);
            }
        }

        if (profiles.length) {
            const userModels = await operator.handleUsers({users: profiles, prepareRecordsOnly: true});
            models.push(...userModels);
        }

        await operator.batchRecords(models);
        EphemeralStore.creatingDMorGMTeammates = [];
        fetchRolesIfNeeded(serverUrl, member.roles.split(' '));
        return {data: created};
    } catch (error) {
        EphemeralStore.creatingDMorGMTeammates = [];
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
}

export async function fetchChannels(serverUrl: string, teamId: string, page = 0, perPage: number = General.CHANNELS_CHUNK_SIZE) {
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
}

export async function makeDirectChannel(serverUrl: string, userId: string, displayName = '', shouldSwitchToChannel = true) {
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
}

export async function fetchArchivedChannels(serverUrl: string, teamId: string, page = 0, perPage: number = General.CHANNELS_CHUNK_SIZE) {
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
}

export async function createGroupChannel(serverUrl: string, userIds: string[]) {
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
        EphemeralStore.creatingDMorGMTeammates = userIds;
        const created = await client.createGroupChannel(userIds);

        // Check the channel previous existency: if the channel already have
        // posts is because it existed before.
        if (created.total_msg_count > 0) {
            EphemeralStore.creatingChannel = false;
            return {data: created};
        }

        const preferences = await queryPreferencesByCategoryAndName(operator.database, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT).fetch();
        const system = await getCommonSystemValues(operator.database);
        const teammateDisplayNameSetting = getTeammateNameDisplaySetting(preferences || [], system.config, system.license);
        const {directChannels, users} = await fetchMissingDirectChannelsInfo(serverUrl, [created], currentUser.locale, teammateDisplayNameSetting, currentUser.id, true);

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
            if (channelPromises.length) {
                const channelModels = await Promise.all(channelPromises);
                const models: Model[] = channelModels.flat();
                const userModels = await operator.handleUsers({users, prepareRecordsOnly: true});
                const categoryModels = await addChannelToDefaultCategory(serverUrl, created, true);
                if (categoryModels.models?.length) {
                    models.push(...categoryModels.models);
                }

                models.push(...userModels);
                operator.batchRecords(models);
            }
        }
        EphemeralStore.creatingDMorGMTeammates = [];
        fetchRolesIfNeeded(serverUrl, member.roles.split(' '));
        return {data: created};
    } catch (error) {
        EphemeralStore.creatingDMorGMTeammates = [];
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
}

export async function fetchSharedChannels(serverUrl: string, teamId: string, page = 0, perPage: number = General.CHANNELS_CHUNK_SIZE) {
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
}

export async function makeGroupChannel(serverUrl: string, userIds: string[], shouldSwitchToChannel = true) {
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
}

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

export async function switchToChannelById(serverUrl: string, channelId: string, teamId?: string, skipLastUnread = false) {
    if (channelId === Screens.GLOBAL_THREADS) {
        return switchToGlobalThreads(serverUrl, teamId);
    }

    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    fetchPostsForChannel(serverUrl, channelId);
    await switchToChannel(serverUrl, channelId, teamId, skipLastUnread);
    setDirectChannelVisible(serverUrl, channelId);
    markChannelAsRead(serverUrl, channelId);
    fetchChannelStats(serverUrl, channelId);

    return {};
}

export async function switchToPenultimateChannel(serverUrl: string, teamId?: string) {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const teamIdToUse = teamId || await getCurrentTeamId(database);
        const channelId = await getNthLastChannelFromTeam(database, teamIdToUse, 1);
        return switchToChannelById(serverUrl, channelId);
    } catch (error) {
        return {error};
    }
}

export async function switchToLastChannel(serverUrl: string, teamId?: string) {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const teamIdToUse = teamId || await getCurrentTeamId(database);
        const channelId = await getNthLastChannelFromTeam(database, teamIdToUse);
        return switchToChannelById(serverUrl, channelId);
    } catch (error) {
        return {error};
    }
}

export async function searchChannels(serverUrl: string, term: string) {
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
}

export async function fetchChannelById(serverUrl: string, id: string) {
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
}

export async function searchAllChannels(serverUrl: string, term: string, archivedOnly = false) {
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
        const myTeamIds = await queryMyTeams(database).fetchIds();
        const channels = await client.searchAllChannels(term, myTeamIds, archivedOnly);
        return {channels};
    } catch (error) {
        return {error};
    }
}

export const updateChannelNotifyProps = async (serverUrl: string, channelId: string, props: Partial<ChannelNotifyProps>) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const userId = await getCurrentUserId(database);
        const notifyProps = {...props, channel_id: channelId, user_id: userId} as ChannelNotifyProps & {channel_id: string; user_id: string};

        await client.updateChannelNotifyProps(notifyProps);

        return {
            notifyProps,
        };
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const toggleMuteChannel = async (serverUrl: string, channelId: string, showSnackBar = false) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const channelSettings = await queryMyChannelSettingsByIds(database, [channelId]).fetch();
        const myChannelSetting = channelSettings?.[0];
        const mark_unread = myChannelSetting.notifyProps?.mark_unread === 'mention' ? 'all' : 'mention';

        const notifyProps: Partial<ChannelNotifyProps> = {...myChannelSetting.notifyProps, mark_unread};
        await updateChannelNotifyProps(serverUrl, channelId, notifyProps);

        await database.write(async () => {
            await myChannelSetting.update((c) => {
                c.notifyProps = notifyProps;
            });
        });

        if (showSnackBar) {
            const onUndo = () => toggleMuteChannel(serverUrl, channelId, false);
            showMuteChannelSnackbar(mark_unread === 'mention', onUndo);
        }

        return {
            notifyProps,
        };
    } catch (error) {
        return {error};
    }
};

export const archiveChannel = async (serverUrl: string, channelId: string) => {
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
        const {database} = operator;
        const config = await getConfig(database);
        EphemeralStore.addArchivingChannel(channelId);
        await client.deleteChannel(channelId);
        if (config?.ExperimentalViewArchivedChannels === 'true') {
            await setChannelDeleteAt(serverUrl, channelId, Date.now());
        } else {
            removeCurrentUserFromChannel(serverUrl, channelId);
        }

        return {error: undefined};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    } finally {
        EphemeralStore.removeArchivingChannel(channelId);
    }
};

export const unarchiveChannel = async (serverUrl: string, channelId: string) => {
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
        EphemeralStore.addArchivingChannel(channelId);
        await client.unarchiveChannel(channelId);
        await setChannelDeleteAt(serverUrl, channelId, Date.now());
        return {error: undefined};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    } finally {
        EphemeralStore.removeArchivingChannel(channelId);
    }
};

export const convertChannelToPrivate = async (serverUrl: string, channelId: string) => {
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
        const {database} = operator;
        const channel = await getChannelById(database, channelId);
        if (channel) {
            EphemeralStore.addConvertingChannel(channelId);
        }
        await client.convertChannelToPrivate(channelId);
        if (channel) {
            channel.prepareUpdate((c) => {
                c.type = General.PRIVATE_CHANNEL;
            });
            await operator.batchRecords([channel]);
        }
        return {error: undefined};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    } finally {
        EphemeralStore.removeConvertingChannel(channelId);
    }
};

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */
import {DeviceEventEmitter} from 'react-native';

import {addChannelToDefaultCategory, handleConvertedGMCategories, storeCategories} from '@actions/local/category';
import {markChannelAsViewed, removeCurrentUserFromChannel, setChannelDeleteAt, storeMyChannelsForTeam, switchToChannel} from '@actions/local/channel';
import {switchToGlobalThreads} from '@actions/local/thread';
import {loadCallForChannel} from '@calls/actions/calls';
import {DeepLink, Events, General, Preferences, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {privateChannelJoinPrompt} from '@helpers/api/channel';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';
import AppsManager from '@managers/apps_manager';
import NetworkManager from '@managers/network_manager';
import {getActiveServer} from '@queries/app/servers';
import {prepareMyChannelsForTeam, getChannelById, getChannelByName, getMyChannel, getChannelInfo, queryMyChannelSettingsByIds, getMembersCountByChannelsId, deleteChannelMembership, queryChannelsById} from '@queries/servers/channel';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {getCommonSystemValues, getConfig, getCurrentChannelId, getCurrentTeamId, getCurrentUserId, getLicense, setCurrentChannelId, setCurrentTeamAndChannelId} from '@queries/servers/system';
import {getNthLastChannelFromTeam, getMyTeamById, getTeamByName, queryMyTeams, removeChannelFromTeamHistory} from '@queries/servers/team';
import {getIsCRTEnabled} from '@queries/servers/thread';
import {getCurrentUser} from '@queries/servers/user';
import {dismissAllModalsAndPopToRoot} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {setTeamLoading} from '@store/team_load_store';
import {generateChannelNameFromDisplayName, getDirectChannelName, isDMorGM} from '@utils/channel';
import {getFullErrorMessage} from '@utils/errors';
import {isTablet} from '@utils/helpers';
import {logDebug, logError, logInfo} from '@utils/log';
import {showMuteChannelSnackbar} from '@utils/snack_bar';
import {displayGroupMessageName, displayUsername} from '@utils/user';

import {fetchGroupsForChannelIfConstrained} from './groups';
import {fetchPostsForChannel} from './post';
import {openChannelIfNeeded, savePreference} from './preference';
import {fetchRolesIfNeeded} from './role';
import {forceLogoutIfNecessary} from './session';
import {addCurrentUserToTeam, fetchTeamByName, removeCurrentUserFromTeam} from './team';
import {fetchProfilesInChannel, fetchProfilesInGroupChannels, fetchProfilesPerChannels, fetchUsersByIds, updateUsersNoLongerVisible} from './user';

import type {Model} from '@nozbe/watermelondb';
import type ChannelModel from '@typings/database/models/servers/channel';
import type {IntlShape} from 'react-intl';

export type MyChannelsRequest = {
    categories?: CategoryWithChannels[];
    channels?: Channel[];
    memberships?: ChannelMembership[];
    error?: unknown;
}

export type ChannelMembersRequest = {
    members?: ChannelMembership[];
    error?: unknown;
}

export async function removeMemberFromChannel(serverUrl: string, channelId: string, userId: string) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const client = NetworkManager.getClient(serverUrl);

        await client.removeFromChannel(userId, channelId);
        await deleteChannelMembership(operator, userId, channelId);

        return {};
    } catch (error) {
        logDebug('error on removeMemberFromChannel', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function fetchChannelMembersByIds(serverUrl: string, channelId: string, userIds: string[], fetchOnly = false): Promise<ChannelMembersRequest> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const members = await client.getChannelMembersByIds(channelId, userIds);

        if (!fetchOnly) {
            const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            if (operator && members.length) {
                const memberships = members.map((u) => ({
                    channel_id: channelId,
                    user_id: u.user_id,
                    scheme_admin: u.scheme_admin,
                }));
                await operator.handleChannelMembership({
                    channelMemberships: memberships,
                    prepareRecordsOnly: false,
                });
            }
        }

        return {members};
    } catch (error) {
        logDebug('error on fetchChannelMembersByIds', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}
export async function updateChannelMemberSchemeRoles(serverUrl: string, channelId: string, userId: string, isSchemeUser: boolean, isSchemeAdmin: boolean, fetchOnly = false) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.updateChannelMemberSchemeRoles(channelId, userId, isSchemeUser, isSchemeAdmin);

        if (!fetchOnly) {
            return fetchMemberInChannel(serverUrl, channelId, userId);
        }

        return {};
    } catch (error) {
        logDebug('error on updateChannelMemberSchemeRoles', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function fetchMemberInChannel(serverUrl: string, channelId: string, userId: string, fetchOnly = false) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const member = await client.getMemberInChannel(channelId, userId);

        if (!fetchOnly) {
            const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const currentUserId = await getCurrentUserId(database);
            if (userId === currentUserId) {
                const isCRTEnabled = await getIsCRTEnabled(database);
                const channel = await client.getChannel(channelId);
                await fetchRolesIfNeeded(serverUrl, member.roles.split(' '), false, false);
                await operator.handleMyChannel({channels: [channel], myChannels: [member], isCRTEnabled, prepareRecordsOnly: false});
            } else {
                await operator.handleChannelMembership({channelMemberships: [member], prepareRecordsOnly: false});
            }
        }
        return {member};
    } catch (error) {
        logDebug('error on getMemberInChannel', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function fetchChannelMemberships(serverUrl: string, channelId: string, options: GetUsersOptions, fetchOnly = false) {
    const {users = []} = await fetchProfilesInChannel(serverUrl, channelId, undefined, options, fetchOnly);
    const userIds = users.map((u) => u.id);

    // MM-49896 https://mattermost.atlassian.net/browse/MM-49896
    // We are not sure the getChannelMembers API returns the same members
    // from getProfilesInChannel.  This guarantees a 1:1 match of the
    // user IDs
    const {members = []} = await fetchChannelMembersByIds(serverUrl, channelId, userIds, true);
    return {users, members};
}

export async function addMembersToChannel(serverUrl: string, channelId: string, userIds: string[], postRootId = '', fetchOnly = false) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const client = NetworkManager.getClient(serverUrl);
        const promises = userIds.map((id) => client.addToChannel(id, channelId, postRootId));
        const channelMemberships: ChannelMembership[] = await Promise.all(promises);
        const {users} = await fetchUsersByIds(serverUrl, userIds, true);

        if (!fetchOnly) {
            const modelPromises: Array<Promise<Model[]>> = [];
            if (users?.length) {
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
            await operator.batchRecords(models.flat(), 'addMembersToChannel');
        }
        return {channelMemberships};
    } catch (error) {
        logDebug('error on addMembersToChannel', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function fetchChannelByName(serverUrl: string, teamId: string, channelName: string, fetchOnly = false) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const channel = await client.getChannelByName(teamId, channelName, true);

        if (!fetchOnly) {
            await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        }

        return {channel};
    } catch (error) {
        logDebug('error on fetchChannelByName', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function createChannel(serverUrl: string, displayName: string, purpose: string, header: string, type: ChannelType) {
    try {
        EphemeralStore.creatingChannel = true;
        const client = NetworkManager.getClient(serverUrl);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

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
            await operator.batchRecords(models, 'createChannel');
        }
        fetchChannelStats(serverUrl, channelData.id, false);
        EphemeralStore.creatingChannel = false;
        return {channel: channelData};
    } catch (error) {
        logDebug('error on createChannel', getFullErrorMessage(error));
        EphemeralStore.creatingChannel = false;
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function patchChannel(serverUrl: string, channelId: string, channelPatch: ChannelPatch) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const channelData = await client.patchChannel(channelId, channelPatch);
        const models = [];

        const channelInfo = (await getChannelInfo(database, channelData.id));
        if (channelInfo && (channelInfo.purpose !== channelData.purpose || channelInfo.header !== channelData.header)) {
            channelInfo.prepareUpdate((v) => {
                v.purpose = channelData.purpose;
                v.header = channelData.header;
            });
            models.push(channelInfo);
        }

        const channel = await getChannelById(database, channelData.id);
        if (channel && (channel.displayName !== channelData.display_name || channel.type !== channelData.type)) {
            channel.prepareUpdate((v) => {
                // DM and GM display names cannot be patched and are formatted client-side; do not overwrite
                if (channelData.type !== General.DM_CHANNEL && channelData.type !== General.GM_CHANNEL) {
                    v.displayName = channelData.display_name;
                }
                v.type = channelData.type;
            });
            models.push(channel);
        }
        if (models?.length) {
            await operator.batchRecords(models.flat(), 'patchChannel');
        }
        return {channel: channelData};
    } catch (error) {
        logDebug('error on patchChannel', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function leaveChannel(serverUrl: string, channelId: string) {
    try {
        EphemeralStore.addLeavingChannel(channelId);
        const client = NetworkManager.getClient(serverUrl);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const isTabletDevice = isTablet();
        const user = await getCurrentUser(database);
        const models: Model[] = [];

        if (!user) {
            return {error: 'current user not found'};
        }

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

        await operator.batchRecords(models, 'leaveChannel');

        if (isTabletDevice) {
            switchToLastChannel(serverUrl);
        } else {
            setCurrentChannelId(operator, '');
        }
        return {};
    } catch (error) {
        logDebug('error on leaveChannel', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    } finally {
        EphemeralStore.removeLeavingChannel(channelId);
    }
}

export async function fetchChannelCreator(serverUrl: string, channelId: string, fetchOnly = false) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const currentUserId = await getCurrentUserId(database);
        const channel = await getChannelById(database, channelId);
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
                await operator.batchRecords(models.flat(), 'fetchChannelCreator');
            }

            return {user};
        }

        return {user: undefined};
    } catch (error) {
        logDebug('error on fetchChannelCreator', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function fetchChannelStats(serverUrl: string, channelId: string, fetchOnly = false) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const stats = await client.getChannelStats(channelId);
        if (!fetchOnly) {
            const channel = await getChannelById(database, channelId);
            if (channel) {
                const channelInfos: Array<Partial<ChannelInfo>> = [{
                    guest_count: stats.guest_count,
                    id: channelId,
                    member_count: stats.member_count,
                    pinned_post_count: stats.pinnedpost_count,
                    files_count: stats.files_count,
                }];
                await operator.handleChannelInfo({channelInfos, prepareRecordsOnly: false});
            }
        }

        return {stats};
    } catch (error) {
        logDebug('error on fetchChannelStats', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function fetchMyChannelsForTeam(serverUrl: string, teamId: string, includeDeleted = true, since = 0, fetchOnly = false, excludeDirect = false, isCRTEnabled?: boolean): Promise<MyChannelsRequest> {
    try {
        if (!fetchOnly) {
            setTeamLoading(serverUrl, true);
        }
        const client = NetworkManager.getClient(serverUrl);
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
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
                await operator.batchRecords(models, 'fetchMyChannelsForTeam');
            }
            setTeamLoading(serverUrl, false);
        }

        return {channels, memberships, categories};
    } catch (error) {
        logDebug('error on fetchMyChannelsForTeam', getFullErrorMessage(error));
        if (!fetchOnly) {
            setTeamLoading(serverUrl, false);
        }
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function fetchMyChannel(serverUrl: string, teamId: string, channelId: string, fetchOnly = false): Promise<MyChannelsRequest> {
    try {
        const client = NetworkManager.getClient(serverUrl);

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
        logDebug('error on fetchMyChannel', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function fetchMissingDirectChannelsInfo(serverUrl: string, directChannels: Channel[], locale?: string, teammateDisplayNameSetting?: string, currentUserId?: string, fetchOnly = false) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const displayNameByChannel: Record<string, string> = {};
        const users: UserProfile[] = [];
        const updatedChannels = new Set<Channel>();

        const dms: Channel[] = [];
        const dmIds: string[] = [];
        const dmWithoutDisplayName = new Set<string>();
        const gms: Channel[] = [];
        const channelIds = new Set(directChannels.map((c) => c.id));
        const storedChannels = await queryChannelsById(database, Array.from(channelIds)).fetch();
        const storedChannelsMap = new Map(storedChannels.map((c) => [c.id, c]));

        for (const c of directChannels) {
            if (c.type === General.DM_CHANNEL) {
                dms.push(c);
                dmIds.push(c.id);
                if (!c.display_name && !storedChannelsMap.get(c.id)?.displayName) {
                    dmWithoutDisplayName.add(c.id);
                }
                continue;
            }
            gms.push(c);
        }

        const currentUser = await getCurrentUser(database);

        // let's filter those channels that we already have the users
        const membersCount = await getMembersCountByChannelsId(database, dmIds);
        const profileChannelsToFetch = dmIds.filter((id) => membersCount[id] <= 1 && dmWithoutDisplayName.has(id));
        const results = await Promise.all([
            profileChannelsToFetch.length ? fetchProfilesPerChannels(serverUrl, profileChannelsToFetch, currentUserId, false) : Promise.resolve({data: undefined}),
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
                    ownDirectChannel.fake = true;
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
            await operator.batchRecords(models.flat(), 'fetchMissingDirectChannelInfo');
        }

        return {directChannels: updatedChannelsArray, users};
    } catch (error) {
        logDebug('error on fetchMissingDirectChannelsInfo', getFullErrorMessage(error));
        return {error};
    }
}

export async function fetchDirectChannelsInfo(serverUrl: string, directChannels: ChannelModel[]) {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const preferences = await queryDisplayNamePreferences(database).fetch();
    const config = await getConfig(database);
    const license = await getLicense(database);
    const teammateDisplayNameSetting = getTeammateNameDisplaySetting(preferences, config?.LockTeammateNameDisplay, config?.TeammateNameDisplay, license);
    const currentUser = await getCurrentUser(database);
    const channels = directChannels.map((d) => d.toApi());
    return fetchMissingDirectChannelsInfo(serverUrl, channels, currentUser?.locale, teammateDisplayNameSetting, currentUser?.id);
}

export async function joinChannel(serverUrl: string, teamId: string, channelId?: string, channelName?: string, fetchOnly = false) {
    let member: ChannelMembership | undefined;
    let channel: Channel | undefined;

    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const userId = await getCurrentUserId(database);

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
                        await operator.batchRecords(flattenedModels, 'joinChannel');
                    } catch {
                        logError('FAILED TO BATCH CHANNELS');
                    }
                }
            }
        }
    } catch (error) {
        logDebug('error on joinChannel', getFullErrorMessage(error));
        if (channelId || channel?.id) {
            EphemeralStore.removeJoiningChannel(channelId || channel!.id);
        }
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }

    if (channelId || channel?.id) {
        loadCallForChannel(serverUrl, channelId || channel!.id);
        EphemeralStore.removeJoiningChannel(channelId || channel!.id);
    }
    return {channel, member};
}

export async function joinChannelIfNeeded(serverUrl: string, channelId: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const myChannel = await getMyChannel(database, channelId);
        if (myChannel) {
            return {};
        }

        return joinChannel(serverUrl, '', channelId);
    } catch (error) {
        return {error};
    }
}

export async function markChannelAsRead(serverUrl: string, channelId: string, updateLocal = false) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.viewMyChannel(channelId);

        if (updateLocal) {
            await markChannelAsViewed(serverUrl, channelId, true);
        }

        return {};
    } catch (error) {
        logDebug('error on markChannelAsRead', getFullErrorMessage(error));
        return {error};
    }
}

export async function unsetActiveChannelOnServer(serverUrl: string) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.viewMyChannel('');
        return {};
    } catch (error) {
        logDebug('error on markChannelAsRead', getFullErrorMessage(error));
        return {error};
    }
}

export async function switchToChannelByName(serverUrl: string, channelName: string, teamName: string, errorHandler: (intl: IntlShape) => void, intl: IntlShape) {
    const onError = (joinedTeam: boolean, teamId?: string) => {
        errorHandler(intl);
        if (joinedTeam && teamId) {
            removeCurrentUserFromTeam(serverUrl, teamId, false);
        }
    };

    let joinedTeam = false;
    let teamId = '';

    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        if (teamName === DeepLink.Redirect) {
            teamId = await getCurrentTeamId(database);
        } else {
            const team = await getTeamByName(database, teamName);
            const isTeamMember = team ? await getMyTeamById(database, team.id) : false;
            teamId = team?.id || '';

            if (!isTeamMember) {
                const fetchRequest = await fetchTeamByName(serverUrl, teamName);
                if (!fetchRequest.team) {
                    onError(joinedTeam);
                    return {error: fetchRequest.error || 'no team received'};
                }
                const {error} = await addCurrentUserToTeam(serverUrl, fetchRequest.team.id);
                if (error) {
                    onError(joinedTeam);
                    return {error};
                }
                teamId = fetchRequest.team.id;
                joinedTeam = true;
            }
        }

        const channel = await getChannelByName(database, teamId, channelName);
        const isChannelMember = channel ? await getMyChannel(database, channel.id) : false;
        let channelId = channel?.id || '';
        if (!isChannelMember) {
            const fetchRequest = await fetchChannelByName(serverUrl, teamId, channelName, true);
            if (!fetchRequest.channel) {
                onError(joinedTeam, teamId);
                return {error: fetchRequest.error || 'cannot fetch channel'};
            }
            if (fetchRequest.channel.type === General.PRIVATE_CHANNEL) {
                const {join} = await privateChannelJoinPrompt(fetchRequest.channel.display_name, intl);
                if (!join) {
                    onError(joinedTeam, teamId);
                    return {error: 'Refused to join Private channel'};
                }
            }

            logInfo('joining channel', fetchRequest.channel.display_name, fetchRequest.channel.id);
            const joinRequest = await joinChannel(serverUrl, teamId, undefined, channelName, false);
            if (!joinRequest.channel) {
                onError(joinedTeam, teamId);
                return {error: joinRequest.error || 'no channel returned from join'};
            }

            channelId = fetchRequest.channel.id;
        }

        switchToChannelById(serverUrl, channelId, teamId);
        return {};
    } catch (error) {
        onError(joinedTeam, teamId);
        return {error};
    }
}

export async function goToNPSChannel(serverUrl: string) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const user = await client.getUserByUsername(General.NPS_PLUGIN_BOT_USERNAME);
        const {data, error} = await createDirectChannel(serverUrl, user.id);
        if (error || !data) {
            throw error || new Error('channel not found');
        }
        await switchToChannelById(serverUrl, data.id, data.team_id);
    } catch (error) {
        logDebug('error on goToNPSChannel', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }

    return {};
}

export async function createDirectChannel(serverUrl: string, userId: string, displayName = '') {
    try {
        EphemeralStore.creatingDMorGMTeammates = [userId];
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const client = NetworkManager.getClient(serverUrl);
        const currentUser = await getCurrentUser(database);
        if (!currentUser) {
            return {error: 'Cannot get the current user'};
        }

        const channelName = getDirectChannelName(currentUser.id, userId);
        const channel = await getChannelByName(database, '', channelName);
        if (channel) {
            openChannelIfNeeded(serverUrl, channel.id);
            return {data: channel.toApi()};
        }

        const created = await client.createDirectChannel([userId, currentUser.id]);
        const profiles: UserProfile[] = [];

        if (displayName) {
            created.display_name = displayName;
        } else {
            const preferences = await queryDisplayNamePreferences(database, Preferences.NAME_NAME_FORMAT).fetch();
            const license = await getLicense(database);
            const config = await getConfig(database);
            const teammateDisplayNameSetting = getTeammateNameDisplaySetting(preferences || [], config.LockTeammateNameDisplay, config.TeammateNameDisplay, license);
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

        const preferences = [
            {user_id: currentUser.id, category: Preferences.CATEGORIES.DIRECT_CHANNEL_SHOW, name: userId, value: 'true'},
            {user_id: currentUser.id, category: Preferences.CATEGORIES.CHANNEL_OPEN_TIME, name: created.id, value: new Date().getTime().toString()},
        ];
        const preferenceModels = await savePreference(serverUrl, preferences, true);
        if (preferenceModels.preferences?.length) {
            models.push(...preferenceModels.preferences);
        }

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

        await operator.batchRecords(models, 'createDirectChannel');
        EphemeralStore.creatingDMorGMTeammates = [];
        fetchRolesIfNeeded(serverUrl, member.roles.split(' '));
        return {data: created};
    } catch (error) {
        logDebug('error on createDirectChannel', getFullErrorMessage(error));
        EphemeralStore.creatingDMorGMTeammates = [];
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function fetchChannels(serverUrl: string, teamId: string, page = 0, perPage: number = General.CHANNELS_CHUNK_SIZE) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const channels = await client.getChannels(teamId, page, perPage);

        return {channels};
    } catch (error) {
        logDebug('error on fetchChannels', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function makeDirectChannel(serverUrl: string, userId: string, displayName = '', shouldSwitchToChannel = true) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentUserId = await getCurrentUserId(database);
        const channelName = getDirectChannelName(userId, currentUserId);
        let channel: Channel|ChannelModel|undefined = await getChannelByName(database, '', channelName);
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
    try {
        const client = NetworkManager.getClient(serverUrl);
        const channels = await client.getArchivedChannels(teamId, page, perPage);

        return {channels};
    } catch (error) {
        logDebug('error on fetchArchivedChannels', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function createGroupChannel(serverUrl: string, userIds: string[]) {
    try {
        EphemeralStore.creatingDMorGMTeammates = userIds;
        const client = NetworkManager.getClient(serverUrl);
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentUser = await getCurrentUser(database);
        if (!currentUser) {
            return {error: 'Cannot get the current user'};
        }

        const created = await client.createGroupChannel(userIds);

        // Check the channel previous existency: if the channel already have
        // posts is because it existed before.
        if (created.total_msg_count > 0) {
            openChannelIfNeeded(serverUrl, created.id);
            EphemeralStore.creatingChannel = false;
            return {data: created};
        }

        const displayNamePreferences = await queryDisplayNamePreferences(database, Preferences.NAME_NAME_FORMAT).fetch();
        const license = await getLicense(database);
        const config = await getConfig(database);
        const teammateDisplayNameSetting = getTeammateNameDisplaySetting(displayNamePreferences || [], config.LockTeammateNameDisplay, config.TeammateNameDisplay, license);
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

                const preferences = [
                    {user_id: currentUser.id, category: Preferences.CATEGORIES.GROUP_CHANNEL_SHOW, name: created.id, value: 'true'},
                    {user_id: currentUser.id, category: Preferences.CATEGORIES.CHANNEL_OPEN_TIME, name: created.id, value: new Date().getTime().toString()},
                ];
                const preferenceModels = await savePreference(serverUrl, preferences, true);
                if (preferenceModels.preferences?.length) {
                    models.push(...preferenceModels.preferences);
                }

                models.push(...userModels);
                operator.batchRecords(models, 'createGroupChannel');
            }
        }
        EphemeralStore.creatingDMorGMTeammates = [];
        fetchRolesIfNeeded(serverUrl, member.roles.split(' '));
        return {data: created};
    } catch (error) {
        logDebug('error on createGroupChannel', getFullErrorMessage(error));
        EphemeralStore.creatingDMorGMTeammates = [];
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function fetchSharedChannels(serverUrl: string, teamId: string, page = 0, perPage: number = General.CHANNELS_CHUNK_SIZE) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const channels = await client.getSharedChannels(teamId, page, perPage);

        return {channels};
    } catch (error) {
        logDebug('error on fetchSharedChannels', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function makeGroupChannel(serverUrl: string, userIds: string[], shouldSwitchToChannel = true) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentUserId = await getCurrentUserId(database);
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
    try {
        const client = NetworkManager.getClient(serverUrl);
        const channelMemberCountsByGroup = await client.getChannelMemberCountsByGroup(channelId, includeTimezones);
        return {channelMemberCountsByGroup};
    } catch (error) {
        logDebug('error on getChannelMemberCountsByGroup', getFullErrorMessage(error));
        return {error};
    }
}

export async function getChannelTimezones(serverUrl: string, channelId: string) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const channelTimezones = await client.getChannelTimezones(channelId);
        return {channelTimezones};
    } catch (error) {
        logDebug('error on getChannelTimezones', getFullErrorMessage(error));
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

    DeviceEventEmitter.emit(Events.CHANNEL_SWITCH, true);

    fetchPostsForChannel(serverUrl, channelId);
    await switchToChannel(serverUrl, channelId, teamId, skipLastUnread);
    openChannelIfNeeded(serverUrl, channelId);
    markChannelAsRead(serverUrl, channelId);
    fetchChannelStats(serverUrl, channelId);
    fetchGroupsForChannelIfConstrained(serverUrl, channelId);

    DeviceEventEmitter.emit(Events.CHANNEL_SWITCH, false);

    if (await AppsManager.isAppsEnabled(serverUrl)) {
        AppsManager.fetchBindings(serverUrl, channelId);
    }

    return {};
}

export async function switchToPenultimateChannel(serverUrl: string, teamId?: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const teamIdToUse = teamId || await getCurrentTeamId(database);
        const channelId = await getNthLastChannelFromTeam(database, teamIdToUse, 1);
        return switchToChannelById(serverUrl, channelId);
    } catch (error) {
        return {error};
    }
}

export async function switchToLastChannel(serverUrl: string, teamId?: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const teamIdToUse = teamId || await getCurrentTeamId(database);
        const channelId = await getNthLastChannelFromTeam(database, teamIdToUse);
        return switchToChannelById(serverUrl, channelId);
    } catch (error) {
        return {error};
    }
}

export async function searchChannels(serverUrl: string, term: string, teamId: string, isSearch = false) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const autoCompleteFunc = isSearch ? client.autocompleteChannelsForSearch : client.autocompleteChannels;
        const channels = await autoCompleteFunc(teamId, term);
        return {channels};
    } catch (error) {
        logDebug('error on searchChannels', getFullErrorMessage(error));
        return {error};
    }
}

export async function fetchChannelById(serverUrl: string, id: string) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const channel = await client.getChannel(id);
        return {channel};
    } catch (error) {
        logDebug('error on fetchChannelById', getFullErrorMessage(error));
        return {error};
    }
}

export async function searchAllChannels(serverUrl: string, term: string, archivedOnly = false) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const myTeamIds = await queryMyTeams(database).fetchIds();
        const channels = await client.searchAllChannels(term, myTeamIds, archivedOnly);
        return {channels};
    } catch (error) {
        logDebug('error on searchAllChannels', getFullErrorMessage(error));
        return {error};
    }
}

export const updateChannelNotifyProps = async (serverUrl: string, channelId: string, props: Partial<ChannelNotifyProps>) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const userId = await getCurrentUserId(database);
        const notifyProps = {...props, channel_id: channelId, user_id: userId} as ChannelNotifyProps & {channel_id: string; user_id: string};

        await client.updateChannelNotifyProps(notifyProps);

        return {
            notifyProps,
        };
    } catch (error) {
        logDebug('error on updateChannelNotifyProps', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const toggleMuteChannel = async (serverUrl: string, channelId: string, showSnackBar = false) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
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
    try {
        EphemeralStore.addArchivingChannel(channelId);
        const client = NetworkManager.getClient(serverUrl);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const config = await getConfig(database);
        await client.deleteChannel(channelId);
        if (config?.ExperimentalViewArchivedChannels === 'true') {
            await setChannelDeleteAt(serverUrl, channelId, Date.now());
        } else {
            removeCurrentUserFromChannel(serverUrl, channelId);
        }

        return {};
    } catch (error) {
        logDebug('error on archiveChannel', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    } finally {
        EphemeralStore.removeArchivingChannel(channelId);
    }
};

export const unarchiveChannel = async (serverUrl: string, channelId: string) => {
    try {
        EphemeralStore.addArchivingChannel(channelId);
        const client = NetworkManager.getClient(serverUrl);
        await client.unarchiveChannel(channelId);
        await setChannelDeleteAt(serverUrl, channelId, 0);
        return {};
    } catch (error) {
        logDebug('error on unarchiveChannel', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    } finally {
        EphemeralStore.removeArchivingChannel(channelId);
    }
};

export const convertChannelToPrivate = async (serverUrl: string, channelId: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const channel = await getChannelById(database, channelId);
        if (channel) {
            EphemeralStore.addConvertingChannel(channelId);
        }
        await client.convertChannelToPrivate(channelId);
        if (channel) {
            channel.prepareUpdate((c) => {
                c.type = General.PRIVATE_CHANNEL;
            });
            await operator.batchRecords([channel], 'convertChannelToPrivate');
        }
        return {};
    } catch (error) {
        logDebug('error on convertChannelToPrivate', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    } finally {
        EphemeralStore.removeConvertingChannel(channelId);
    }
};

export const handleKickFromChannel = async (serverUrl: string, channelId: string, event: string = Events.LEAVE_CHANNEL) => {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const currentChannelId = await getCurrentChannelId(database);
        if (currentChannelId !== channelId) {
            return;
        }

        const currentServer = await getActiveServer();
        if (currentServer?.url === serverUrl) {
            const channel = await getChannelById(database, channelId);
            DeviceEventEmitter.emit(event, channel?.displayName);
            await dismissAllModalsAndPopToRoot();
        }

        const tabletDevice = isTablet();

        if (tabletDevice) {
            const teamId = await getCurrentTeamId(database);
            await removeChannelFromTeamHistory(operator, teamId, channelId);
            const newChannelId = await getNthLastChannelFromTeam(database, teamId, 0, channelId);
            if (newChannelId) {
                if (currentServer?.url === serverUrl) {
                    if (newChannelId === Screens.GLOBAL_THREADS) {
                        await switchToGlobalThreads(serverUrl, teamId, false);
                    } else {
                        await switchToChannelById(serverUrl, newChannelId, teamId, true);
                    }
                } else {
                    await setCurrentTeamAndChannelId(operator, teamId, channelId);
                }
            } // TODO else jump to "join a channel" screen https://mattermost.atlassian.net/browse/MM-41051
        } else {
            await setCurrentChannelId(operator, '');
        }
    } catch (error) {
        logDebug('cannot kick user from channel', error);
    }
};

export const fetchGroupMessageMembersCommonTeams = async (serverUrl: string, channelId: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const teams = await client.getGroupMessageMembersCommonTeams(channelId);
        return {teams};
    } catch (error) {
        logDebug('error on getGroupMessageMembersCommonTeams', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const convertGroupMessageToPrivateChannel = async (serverUrl: string, channelId: string, targetTeamId: string, displayName: string) => {
    try {
        const name = generateChannelNameFromDisplayName(displayName);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const existingChannel = await getChannelById(database, channelId);
        if (existingChannel) {
            EphemeralStore.addConvertingChannel(channelId);
        }

        const client = NetworkManager.getClient(serverUrl);
        const updatedChannel = await client.convertGroupMessageToPrivateChannel(channelId, targetTeamId, displayName, name);

        if (existingChannel) {
            existingChannel.prepareUpdate((channel) => {
                channel.type = General.PRIVATE_CHANNEL;
                channel.displayName = displayName;
                channel.name = name;
                channel.teamId = targetTeamId;
            });

            const models: Model[] = [existingChannel];

            const {models: categoryUpdateModels} = await handleConvertedGMCategories(serverUrl, channelId, targetTeamId, true);
            if (categoryUpdateModels) {
                models.push(...categoryUpdateModels);
            }

            await operator.batchRecords(models, 'convertGroupMessageToPrivateChannel');
        }

        return {updatedChannel};
    } catch (error) {
        logError('error on convertGroupMessageToPrivateChannel', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    } finally {
        EphemeralStore.removeConvertingChannel(channelId);
    }
};

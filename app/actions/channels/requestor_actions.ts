// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@mm-redux/client';
import {General, Preferences} from '@mm-redux/constants';
import {RoleTypes} from '@mm-redux/action_types';

import {Action, ActionFunc, DispatchFunc, GetStateFunc, ErrorResult, batchActions, SuccessResult} from '@mm-redux/types/actions';
import {Channel, ChannelNotifyProps, ChannelMembership} from '@mm-redux/types/channels';

import {
    getMissingProfilesByIds,
    receivedProfileInChannel,
    receivedProfileNotInChannel,
    receivedProfilesListInChannel,
} from '@mm-redux/actions/users';
import {forceLogoutIfNecessary} from '@mm-redux/actions/helpers';
import {logError} from '@mm-redux/actions/errors';
import {loadRolesIfNeeded, receivedRoles} from '@mm-redux/actions/roles';
import {
    receivedPreferences,
    savePreferences,
    markGroupChannelOpen,
} from '@mm-redux/actions/preferences';

import {
    getCurrentChannelId,
    getChannelsInTeam,
    getChannel as selectChannel,
    getMyChannelMember as selectMyChannelMember,
    getChannelMembersInChannels as selectChannelMembersInChannel,
    isManuallyUnread,
} from '@mm-redux/selectors/entities/channels';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {getConfig} from '@mm-redux/selectors/entities/general';

import {
    notifyPropsChanged,
    getChannelsIdForTeam,
    isGroupChannel,
    isDirectChannel,
} from '@mm-redux/utils/channel_utils';

import {
    createChannelRequest,
    createChannelSuccess,
    createChannelFailure,
    updateChannelRequest,
    updateChannelSuccess,
    updateChannelFailure,
    deleteChannelSuccess,
    channelsFailure,
    getChannelsRequest,
    getChannelsSuccess,
    getChannelsFailure,
    getAllChannelsRequest,
    getAllChannelsSuccess,
    getAllChannelsFailure,
    receivedChannel,
    receivedChannels,
    receivedAllChannels,
    receivedTotalChannelCount,
    receivedMyChannelMember,
    receivedMyChannelMembers,
    receivedMyChannelsWithMembers,
    receivedChannelMember,
    receivedChannelMembers,
    receivedChannelProps,
    receivedChannelStats,
    removeManuallyUnread,
    addChannelMemberSuccess,
    removeChannelMemberSuccess,
    decrementUnreadMessageCount,
    decrementUnreadMentionCount,
    leaveChannel,
    selectRedirectChannelForTeam,
    loadDirectMessages,
} from '@actions/channels';
import {createMemberForNewChannel} from '@actions/helpers/channels';
import {promisesWithRetry} from '@actions/helpers/general';
import {removeLastChannelForTeam} from '@actions/views/channels';
import {loadUnreadChannelPosts} from '@actions/views/post/index';
import {buildPreference} from '@utils/preferences';

export function createChannel(channel: Channel, userId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let createdChannel;
        try {
            createdChannel = await Client4.createChannel(channel);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(batchActions([
                createChannelFailure(error),
                logError(error),
            ]));
            return {error};
        }

        const actions: Action[] = [];
        const state = getState();

        const channelInState = selectChannel(state, createdChannel.id);
        if (!channelInState) {
            actions.push(receivedChannel(createdChannel));
        }

        let memberInState = selectMyChannelMember(state, createdChannel.id);
        if (!memberInState) {
            const roles = [General.CHANNEL_USER_ROLE, General.CHANNEL_ADMIN_ROLE];
            const member = createMemberForNewChannel(channel, userId, roles);

            actions.push(receivedMyChannelMember(member));
            dispatch(loadRolesIfNeeded(roles));
        }

        actions.push(createChannelSuccess());

        dispatch(batchActions(actions));

        return {data: createdChannel};
    };
}

export function createDirectChannel(userId: string, otherUserId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        dispatch(createChannelRequest());

        let createdChannel;
        try {
            createdChannel = await Client4.createDirectChannel([userId, otherUserId]);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(batchActions([
                createChannelFailure(error),
                logError(error),
            ]));
            return {error};
        }

        const roles = [General.CHANNEL_USER_ROLE];
        const member = createMemberForNewChannel(createdChannel, userId, roles);

        const channelOpenTime = new Date().getTime().toString();
        const preferences = [
            buildPreference(Preferences.CATEGORY_CHANNEL_OPEN_TIME, userId, createdChannel.id, channelOpenTime),
            buildPreference(Preferences.CATEGORY_DIRECT_CHANNEL_SHOW, userId, otherUserId, 'true'),
        ];
        dispatch(savePreferences(userId, preferences));

        const profiles = [{id: userId}, {id: otherUserId}];
        dispatch(batchActions([
            receivedChannel(createdChannel),
            receivedMyChannelMember(member),
            receivedPreferences(preferences),
            createChannelSuccess(),
            receivedProfilesListInChannel(createdChannel.id, profiles),
        ]));

        dispatch(loadRolesIfNeeded(roles));

        return {data: createdChannel};
    };
}

export function createGroupChannel(userIds: Array<string>): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        dispatch(createChannelRequest());

        let createdChannel;
        try {
            createdChannel = await Client4.createGroupChannel(userIds);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(batchActions([
                createChannelFailure(error),
                logError(error),
            ]));
            return {error};
        }

        const state = getState();
        const currentUserId = getCurrentUserId(state);

        let roles = [General.CHANNEL_USER_ROLE];
        let member = createMemberForNewChannel(createdChannel, currentUserId, roles);

        // Check the channel previous existency:
        // If the channel already has posts it's because it existed before.
        if (createdChannel.total_msg_count > 0) {
            const storeMember = selectMyChannelMember(state, createdChannel.id);
            if (storeMember === null) {
                try {
                    member = await Client4.getMyChannelMember(createdChannel.id);
                } catch (error) {
                    // Log the error and keep going with the generated membership.
                    dispatch(logError(error));
                }
            } else {
                member = storeMember as ChannelMembership;
            }
        }

        dispatch(markGroupChannelOpen(createdChannel.id));

        const profilesInChannel = userIds.map((id) => ({id}));
        profilesInChannel.push({id: currentUserId}); // currentUserId is optionally in userIds, but the reducer will get rid of a duplicate

        dispatch(batchActions([
            receivedChannel(createdChannel),
            receivedMyChannelMember(member),
            createChannelSuccess(),
            receivedProfilesListInChannel(createdChannel.id, profilesInChannel),
        ]));

        roles = member?.roles?.split(' ');
        if (roles) {
            dispatch(loadRolesIfNeeded(roles));
        }

        return {data: createdChannel};
    };
}

export function getChannels(teamId: string, page = 0, perPage: number = General.CHANNELS_CHUNK_SIZE): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        dispatch(getChannelsRequest());

        let channels;
        try {
            channels = await Client4.getChannels(teamId, page, perPage);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(batchActions([
                getChannelsFailure(error),
                logError(error),
            ]));
            return {error};
        }

        dispatch(batchActions([
            receivedChannels(teamId, channels),
            getChannelsSuccess(),
        ]));

        return {data: channels};
    };
}

export function getAllChannels(page = 0, perPage: number = General.CHANNELS_CHUNK_SIZE, notAssociatedToGroup = '', excludeDefaultChannels = false): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        dispatch(getAllChannelsRequest());

        let channels;
        try {
            channels = await Client4.getAllChannels(page, perPage, notAssociatedToGroup, excludeDefaultChannels);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(batchActions([
                getAllChannelsFailure(error),
                logError(error),
            ]));
            return {error};
        }

        dispatch(batchActions([
            receivedAllChannels(channels),
            getAllChannelsSuccess(),
        ]));

        return {data: channels};
    };
}

export function getAllChannelsWithCount(page = 0, perPage: number = General.CHANNELS_CHUNK_SIZE, notAssociatedToGroup = '', excludeDefaultChannels = false): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        dispatch(getAllChannelsRequest());

        let payload;
        try {
            payload = await Client4.getAllChannels(page, perPage, notAssociatedToGroup, excludeDefaultChannels, true);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(batchActions([
                getAllChannelsFailure(error),
                logError(error),
            ]));
            return {error};
        }

        const {channels, total_count} = payload;
        dispatch(batchActions([
            receivedAllChannels(channels),
            getAllChannelsSuccess(),
            receivedTotalChannelCount(total_count),
        ]));

        return {data: payload};
    };
}

export function getArchivedChannels(teamId: string, page = 0, perPage: number = General.CHANNELS_CHUNK_SIZE): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let archivedChannels;
        try {
            archivedChannels = await Client4.getArchivedChannels(teamId, page, perPage);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            return {error};
        }

        dispatch(receivedChannels(teamId, archivedChannels));

        return {data: archivedChannels};
    };
}

export function getChannelsForSearch(teamId: string, term: string, archived?: boolean): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        dispatch(getChannelsRequest());

        let channels;
        try {
            if (archived) {
                channels = await Client4.searchArchivedChannels(teamId, term);
            } else {
                channels = await Client4.searchChannels(teamId, term);
            }
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(batchActions([
                getChannelsFailure(error),
                logError(error),
            ]));
            return {error};
        }

        dispatch(batchActions([
            receivedChannels(teamId, channels),
            getChannelsSuccess(),
        ]));

        return {data: channels};
    };
}

export function getAllChannelsForSearch(term: string, notAssociatedToGroup = '', excludeDefaultChannels = false, page?: number, perPage?: number): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        dispatch(getAllChannelsRequest());

        let response;
        try {
            response = await Client4.searchAllChannels(term, notAssociatedToGroup, excludeDefaultChannels, page, perPage);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(batchActions([
                getAllChannelsFailure(error),
                logError(error),
            ]));
            return {error};
        }

        const channels = response.channels || response;

        dispatch(batchActions([
            receivedAllChannels(channels),
            getAllChannelsSuccess(),
        ]));

        return {data: response};
    };
}

export function getChannelsForAutocompleteSearch(teamId: string, term: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        dispatch(getChannelsRequest());

        let channels;
        try {
            channels = await Client4.autocompleteChannelsForSearch(teamId, term);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(batchActions([
                getChannelsFailure(error),
                logError(error),
            ]));
            return {error};
        }

        dispatch(batchActions([
            receivedChannels(teamId, channels),
            getChannelsSuccess(),
        ]));

        return {data: channels};
    };
}

export function getMyChannelsAndMembersForTeam(teamId: string, skipBatchDispatch: boolean = false): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const currentUserId = getCurrentUserId(state);
        const data: any = {};
        const actions = [];

        if (currentUserId) {
            let results;
            try {
                results = await promisesWithRetry([
                    Client4.getMyChannels(teamId, true),
                    Client4.getMyChannelMembers(teamId),
                ]);
            } catch (error) {
                results = {error};
            }

            const {error} = <ErrorResult>results;
            if (error) {
                const channelsInTeam = getChannelsInTeam(state);
                const hasLoadedChannels = channelsInTeam && channelsInTeam[teamId]?.length > 0;

                return {error: hasLoadedChannels ? null : error};
            }

            const {data: [channels, channelMembers]} = <SuccessResult>results;
            data.channels = channels;
            data.channelMembers = channelMembers;

            if (channels?.length) {
                if (!skipBatchDispatch) {
                    actions.push(receivedMyChannelsWithMembers(channels, channelMembers));

                    const rolesToLoad: Set<string> = new Set();
                    for (const member of channelMembers) {
                        for (const role of member.roles.split(' ')) {
                            if (role) {
                                rolesToLoad.add(role);
                            }
                        }
                    }

                    if (rolesToLoad.size > 0) {
                        let roles;
                        try {
                            roles = await Client4.getRolesByNames(Array.from(rolesToLoad));
                        } catch (error) {
                            // Do nothing;
                        }

                        if (roles?.length) {
                            data.roles = roles;
                            actions.push(receivedRoles(roles));
                        }
                    }

                    dispatch(batchActions(actions, 'BATCH_GET_MY_CHANNELS_FOR_TEAM'));
                }

                // Fetch needed profiles from channel creators and direct channels
                dispatch(loadDirectMessages(channels, channelMembers));

                dispatch(loadUnreadChannelPosts(channels, channelMembers));
            }
        }

        return {data};
    };
}

export function getChannel(channelId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let channel;
        try {
            channel = await Client4.getChannel(channelId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(batchActions([
                channelsFailure(error),
                logError(error),
            ]));
            return {error};
        }

        dispatch(receivedChannel(channel));

        return {data: channel};
    };
}

export function getChannelByNameAndTeamName(teamName: string, channelName: string, includeDeleted = false): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let channel;
        try {
            channel = await Client4.getChannelByNameAndTeamName(teamName, channelName, includeDeleted);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(batchActions([
                channelsFailure(error),
                logError(error),
            ]));
            return {error};
        }

        dispatch(receivedChannel(channel));

        return {data: channel};
    };
}

export function getChannelAndMyMember(channelId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let channel;
        let member;
        try {
            channel = await Client4.getChannel(channelId);
            member = await Client4.getMyChannelMember(channelId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(batchActions([
                channelsFailure(error),
                logError(error),
            ]));
            return {error};
        }

        dispatch(batchActions([
            receivedChannel(channel),
            receivedMyChannelMember(member),
        ]));

        dispatch(loadRolesIfNeeded(member.roles.split(' ')));

        return {data: {channel, member}};
    };
}

export function getChannelTimezones(channelId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let channelTimezones;
        try {
            channelTimezones = await Client4.getChannelTimezones(channelId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        return {data: channelTimezones};
    };
}

export function getChannelStats(channelId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let stats;
        try {
            stats = await Client4.getChannelStats(channelId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        dispatch(receivedChannelStats(stats));

        return {data: stats};
    };
}

export function getChannelMembers(channelId: string, page = 0, perPage: number = General.CHANNELS_CHUNK_SIZE): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let channelMembers: ChannelMembership[];

        try {
            channelMembers = await Client4.getChannelMembers(channelId, page, perPage);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        const userIds = channelMembers.map((cm) => cm.user_id);
        dispatch(getMissingProfilesByIds(userIds));

        dispatch(receivedChannelMembers(channelMembers));

        return {data: channelMembers};
    };
}

export function getMyChannelMember(channelId: string) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let member;
        try {
            member = await Client4.getMyChannelMember(channelId);
        } catch (error) {
            return {error};
        }

        dispatch(receivedMyChannelMember(member))

        return {data: member};
    };
}

export function getMyChannelMembers(teamId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let channelMembers;
        try {
            channelMembers = await Client4.getMyChannelMembers(teamId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        const state = getState();
        const currentUserId = getCurrentUserId(state);
        const removeChannelIds = getChannelsIdForTeam(state, teamId);

        dispatch(receivedMyChannelMembers(channelMembers, removeChannelIds, currentUserId));

        const roles = new Set<string>();

        for (const member of channelMembers) {
            for (const role of member.roles.split(' ')) {
                if (role) {
                    roles.add(role);
                }
            }
        }
        if (roles.size > 0) {
            dispatch(loadRolesIfNeeded(roles));
        }

        return {data: channelMembers};
    };
}

export function patchChannel(channelId: string, patch: Channel): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        dispatch(updateChannelRequest());

        let updatedChannel;
        try {
            updatedChannel = await Client4.patchChannel(channelId, patch);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(batchActions([
                updateChannelFailure(error),
                logError(error),
            ]));
            return {error};
        }

        dispatch(batchActions([
            receivedChannel(updatedChannel),
            updateChannelSuccess(),
        ]));

        return {data: updatedChannel};
    };
}

export function updateChannel(channel: Channel): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        dispatch(updateChannelRequest());

        let updatedChannel;
        try {
            updatedChannel = await Client4.updateChannel(channel);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(batchActions([
                updateChannelFailure(error),
                logError(error),
            ]));
            return {error};
        }

        dispatch(batchActions([
            receivedChannel(updatedChannel),
            updateChannelSuccess(),
        ]));

        return {data: updatedChannel};
    };
}

export function updateChannelPrivacy(channelId: string, privacy: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        dispatch(updateChannelRequest());

        let updatedChannel;
        try {
            updatedChannel = await Client4.updateChannelPrivacy(channelId, privacy);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(batchActions([
                updateChannelFailure(error),
                logError(error),
            ]));
            return {error};
        }

        dispatch(batchActions([
            receivedChannel(updatedChannel),
            updateChannelSuccess(),
        ]));

        return {data: updatedChannel};
    };
}

export function updateChannelNotifyProps(userId: string, channelId: string, props: ChannelNotifyProps): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const notifyProps = {
            user_id: userId,
            channel_id: channelId,
            ...props,
        };

        try {
            await Client4.updateChannelNotifyProps(notifyProps);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));

            return {error};
        }

        const state = getState();
        const member = selectMyChannelMember(state, channelId);
        const currentNotifyProps = member?.notify_props || {};

        // This triggers a re-sorting of channel sidebar, so ensure it's called only when
        // notification settings for a channel actually change.
        if (notifyPropsChanged(notifyProps, currentNotifyProps)) {
            const newNotifyProps = {...currentNotifyProps, ...notifyProps};
            dispatch(receivedChannelProps(channelId, newNotifyProps));
        }

        return {data: true};
    };
}

export function convertChannelToPrivate(channelId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        dispatch(updateChannelRequest());

        let updatedChannel;
        try {
            updatedChannel = await Client4.convertChannelToPrivate(channelId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(batchActions([
                updateChannelFailure(error),
                logError(error),
            ]));
            return {error};
        }

        dispatch(batchActions([
            receivedChannel(updatedChannel),
            updateChannelSuccess(),
        ]));

        return {data: updatedChannel};
    };
}

export function unarchiveChannel(channelId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.unarchiveChannel(channelId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        return {data: true};
    };
}

export function markChannelAsRead(channelId: string, prevChannelId?: string, updateLastViewedAt = true): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const prevChanManuallyUnread = isManuallyUnread(state, prevChannelId);

        // Send channel last viewed at to the server
        if (updateLastViewedAt) {
            Client4.viewMyChannel(channelId, prevChanManuallyUnread ? '' : prevChannelId).
                catch((error) => {
                    dispatch(logError(error));
                });
        }

        // Update channel member objects to set all mentions and posts as viewed
        const channel = selectChannel(state, channelId);
        const prevChannel = (!prevChanManuallyUnread && prevChannelId) ? selectChannel(state, prevChannelId) : null; // May be null since prevChannelId is optional

        // Update team member objects to set mentions and posts in channel as viewed
        const member = selectMyChannelMember(state, channelId);
        const prevMember = (!prevChanManuallyUnread && prevChannelId) ? selectMyChannelMember(state, prevChannelId) : null; // May also be null

        const actions: Action[] = [];

        if (channel && member) {
            actions.push(
                decrementUnreadMessageCount(channel, channel.total_msg_count - member.msg_count),
                decrementUnreadMentionCount(channel, member.mention_count),
            );
        }

        if (channel && isManuallyUnread(state, channelId)) {
            actions.push(removeManuallyUnread(channelId));
        }

        if (prevChannel && prevMember) {
            actions.push(
                decrementUnreadMessageCount(prevChannel, prevChannel.total_msg_count - prevMember.msg_count),
                decrementUnreadMentionCount(prevChannel, prevMember.mention_count),
            );
        }

        if (actions.length > 0) {
            dispatch(batchActions(actions));
        }

        return {data: true};
    };
}

export function addChannelMember(channelId: string, userId: string, postRootId = ''): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let member;
        try {
            member = await Client4.addToChannel(userId, channelId, postRootId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        Client4.trackEvent('action', 'action_channels_add_member', {channel_id: channelId});

        dispatch(batchActions([
            receivedProfileInChannel(channelId, userId),
            receivedChannelMember(member),
            addChannelMemberSuccess(channelId),
        ], 'ADD_CHANNEL_MEMBER.BATCH'));

        return {data: member};
    };
}

export function removeChannelMember(channelId: string, userId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {        
        try {
            await Client4.removeFromChannel(userId, channelId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        Client4.trackEvent('action', 'action_channels_remove_member', {channel_id: channelId});

        dispatch(batchActions([
            receivedProfileNotInChannel(channelId, userId),
            removeChannelMemberSuccess(channelId),
        ], 'REMOVE_CHANNEL_MEMBER.BATCH'));

        return {data: true};
    };
}

export function joinChannelById(channelId: string, userId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let channel;
        let member;
        try {
            member = await Client4.addToChannel(userId, channelId);
            channel = await Client4.getChannel(channelId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        Client4.trackEvent('action', 'action_channels_join', {channel_id: channelId});

        dispatch(batchActions([
            receivedChannel(channel),
            receivedMyChannelMember(member),
        ]));

        dispatch(loadRolesIfNeeded(member.roles.split(' ')));

        return {data: {channel, member}};
    };
}

export function joinChannelByName(channelName: string, teamId: string, userId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let channel;
        let member;
        try {
            channel = await Client4.getChannelByName(teamId, channelName, true);
            if (isGroupChannel(channel) || isDirectChannel(channel)) {
                member = await Client4.getChannelMember(channel.id, userId);
            } else {
                member = await Client4.addToChannel(userId, channel.id);
            }
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        Client4.trackEvent('action', 'action_channels_join', {channel_id: channel.id});

        dispatch(batchActions([
            receivedChannel(channel),
            receivedMyChannelMember(member),
        ]));

        dispatch(loadRolesIfNeeded(member.roles.split(' ')));

        return {data: {channel, member}};
    };
}

export function deleteChannel(channelId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.deleteChannel(channelId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }


        const state = getState();
        const config = getConfig(state);
        const viewArchivedChannels = config.ExperimentalViewArchivedChannels === 'true';
        const currentChannelId = getCurrentChannelId(state);

        if (channelId === currentChannelId && !viewArchivedChannels) {
            const currentTeamId = getCurrentTeamId(state);
            dispatch(selectRedirectChannelForTeam(currentTeamId));
        }

        dispatch(deleteChannelSuccess(channelId, viewArchivedChannels));

        return {data: true};
    };
}

export function removeMeFromChannel(channel: Channel, reset: boolean = false): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const currentUserId = getCurrentUserId(state);
        const currentTeamId = getCurrentTeamId(state);
        const currentChannelId = getCurrentChannelId(state);
        const member = selectMyChannelMember(state, channel.id);

        dispatch(removeLastChannelForTeam(currentTeamId, channel.id));

        if (channel.id === currentChannelId || reset) {
            dispatch(selectRedirectChannelForTeam(currentTeamId));
        }

        Client4.trackEvent('action', 'action_channels_leave', {channel_id: channel.id});

        dispatch(leaveChannel(channel, currentUserId));

        try {
            await Client4.removeFromChannel(currentUserId, channel.id);
        } catch (error) {
            const actions = [
                receivedChannel(channel),
                receivedMyChannelMember(member!),
            ];
            dispatch(batchActions(actions));

            return {error};
        }

        return {data: true};
    };
}

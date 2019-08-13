// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from 'mattermost-redux/client';

import {General, PermissionTypes, Preferences, ViewTypes} from 'app/constants';
import {ChannelTypes, UserTypes} from 'app/realm/action_types';
import {isDirectMessageVisible, isGroupMessageVisible} from 'app/realm/utils/channel';
import {reducePermissionsToSet} from 'app/realm/utils/role';
import {getUserIdFromChannelName, isOwnDirectMessage, sortChannelsByDisplayName} from 'app/utils/channels';

import {forceLogoutIfNecessary} from './helpers';
import {loadPostsWithRetry} from './post';
import {savePreferences} from './preference';
import {loadRolesIfNeeded} from './role';

// TODO: Remove redux compatibility
import {reduxStore} from 'app/store';
import {
    loadChannelsIfNecessary,
    selectInitialChannel as selectInitialChannelRedux,
    handleSelectChannel as handleSelectChannelRedux,
    loadProfilesAndTeamMembersForDMSidebar as loadProfilesAndTeamMembersForDMSidebarRedux,
    setChannelLoading as setChannelLoadingRedux,
} from 'app/actions/views/channel';

const MAX_PROFILE_TRIES = 3;

export function loadChannelsForTeam(teamId) {
    return async (dispatch) => {
        try {
            await reduxStore.dispatch(loadChannelsIfNecessary(teamId));
            const [channels, channelMembers] = await Promise.all([
                Client4.getMyChannels(teamId),
                Client4.getMyChannelMembers(teamId),
            ]);

            const data = {
                channels,
                channelMembers,
            };

            dispatch({
                type: ChannelTypes.RECEIVED_MY_CHANNELS,
                data,
            });

            const roles = new Set();
            for (const member of channelMembers) {
                for (const role of member.roles.split(' ')) {
                    roles.add(role);
                }
            }
            if (roles.size > 0) {
                dispatch(loadRolesIfNeeded(roles));
            }

            return {data};
        } catch (error) {
            forceLogoutIfNecessary(error);
            return {error};
        }
    };
}

export function loadSidebarDirectMessagesProfiles(teamId) {
    function buildPref(name, category, userId) {
        return {
            user_id: userId,
            category,
            name,
            value: 'true',
        };
    }

    return async (dispatch, getState) => {
        const realm = getState();
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        const directChannels = realm.objects('Channel').filtered('type=$0 OR type=$1', General.DM_CHANNEL, General.GM_CHANNEL);
        const currentUserId = general.currentUserId;
        const prefs = [];
        let promises = [];
        reduxStore.dispatch(loadProfilesAndTeamMembersForDMSidebarRedux(teamId || general.currentTeamId));

        directChannels.forEach((c) => {
            // we only have the current user, so we need to load the other channel members
            if (!c.members.length || (c.members.length === 1 && c.members[0].user.id === currentUserId && !isOwnDirectMessage(c, currentUserId))) {
                promises.push(dispatch(getProfilesInChannel(c.id, true)));
            }

            const myChannelMember = c.members.filtered('user.id=$0', currentUserId)[0];
            switch (c.type) {
            case General.DM_CHANNEL: {
                const teammateId = getUserIdFromChannelName(currentUserId, c.name);

                // when then DM is hidden but has new messages
                if (!isDirectMessageVisible(realm, general.currentUserId, c.name) && myChannelMember?.mentionCount) {
                    prefs.push(buildPref(teammateId, Preferences.CATEGORY_DIRECT_CHANNEL_SHOW, currentUserId));
                }
                break;
            }
            case General.GM_CHANNEL:
                // when then GM is hidden but has new messages
                if (!isGroupMessageVisible(realm, c.id) && (myChannelMember.mentionCount > 0 || myChannelMember.msgCount < myChannelMember.channels[0].totalMsgCount)) {
                    prefs.push(buildPref(c.id, Preferences.CATEGORY_GROUP_CHANNEL_SHOW, currentUserId));
                }

                break;
            }
        });

        if (promises.length) {
            for (let i = 0; i < MAX_PROFILE_TRIES; i++) {
                const result = await Promise.all(promises); // eslint-disable-line no-await-in-loop
                const failed = [];
                result.forEach((p, index) => {
                    if (p.error) {
                        failed.push(directChannels[index].id);
                    }
                });

                dispatch({
                    type: UserTypes.RECEIVED_BATCH_PROFILES_IN_CHANNEL,
                    data: result,
                });

                if (failed.length) {
                    promises = failed.map((id) => dispatch(getProfilesInChannel(id, true)));
                    continue;
                }

                break;
            }
        }

        if (prefs.length) {
            dispatch(savePreferences(currentUserId, prefs));
        }
    };
}

export function selectInitialChannel(teamId) {
    return async (dispatch, getState) => {
        const realm = getState();
        reduxStore.dispatch(selectInitialChannelRedux(teamId));

        // We'll use the redux state to get the last channel viewed for the team
        const reduxState = reduxStore.getState();
        const lastChannelForTeam = reduxState.views.team.lastChannelForTeam[teamId];
        const lastChannelId = lastChannelForTeam && lastChannelForTeam.length ? lastChannelForTeam[0] : '';
        const lastChannel = realm.objectForPrimaryKey('Channel', lastChannelId);
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);

        const isDMVisible = lastChannel?.type === General.DM_CHANNEL && isDirectMessageVisible(realm, general.currentUserId, lastChannel.name);
        const isGMVisible = lastChannel?.type === General.DM_CHANNEL && isGroupMessageVisible(realm, lastChannelId);

        const isMember = lastChannel?.members.filtered('user.id=$0', general.currentUserId);

        if (isMember?.length && (lastChannel?.team.id === teamId || isDMVisible || isGMVisible)) {
            return dispatch(handleSelectChannel(lastChannelId, false, teamId));
        }

        return dispatch(selectDefaultChannel(teamId));
    };
}

export function selectDefaultChannel(teamId) {
    return async (dispatch, getState) => {
        try {
            const realm = getState();
            const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
            const currentUser = realm.objectForPrimaryKey('User', general.currentUserId);
            const teamMember = realm.objectForPrimaryKey('TeamMember', `${teamId}-${currentUser.id}`);
            const channelsInTeam = realm.objects('Channel').filtered('team.id=$0 AND deleteAt=0 AND type=$1', teamId, General.OPEN_CHANNEL);
            const defaultChannel = channelsInTeam.filtered('name=$0', General.DEFAULT_CHANNEL);
            const iAmMemberOfTheTeamDefaultChannel = Boolean(defaultChannel.filtered('members.user.id=$0', currentUser.id).length);

            const permissions = realm.objects('Role').reduce(reducePermissionsToSet.bind(`${teamMember.roles} ${currentUser.roles}`), new Set());
            const canIJoinPublicChannelsInTeam = permissions.has(PermissionTypes.JOIN_PUBLIC_CHANNELS);

            let channel;
            if (iAmMemberOfTheTeamDefaultChannel || canIJoinPublicChannelsInTeam) {
                channel = defaultChannel[0];
            } else {
                channel = channelsInTeam.filtered('members.user.id=$0', currentUser.id).
                    map((c) => c).
                    sort(sortChannelsByDisplayName.bind(null, currentUser.locale))[0];
            }

            if (channel) {
                return dispatch(handleSelectChannel(channel.id, false, teamId));
            }

            return {error: 'no default channel for this team'};
        } catch (error) {
            return {error};
        }
    };
}

export function handleSelectChannel(channelId, fromPushNotification = false, teamId) {
    return async (dispatch, getState) => {
        reduxStore.dispatch(handleSelectChannelRedux(channelId, fromPushNotification));
        const realm = getState();
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        const currentChannelId = general.currentChannelId;
        let currentChannel = null;
        if (currentChannelId) {
            currentChannel = realm.objectForPrimaryKey('Channel', currentChannelId);
        }

        const lastTeamId = currentChannel?.team?.id || general.currentTeamId || teamId;

        // If the app is open from push notification, we already fetched the posts.
        if (!fromPushNotification) {
            dispatch(loadPostsWithRetry(channelId));
        }

        // TODO: Fix the team based on the channel
        reduxStore.dispatch({
            type: ViewTypes.SET_LAST_CHANNEL_FOR_TEAM,
            teamId: lastTeamId,
            channelId,
        });

        await dispatch({
            type: ChannelTypes.SELECT_CHANNEL,
            data: {
                teamId,
                nextChannel: {
                    id: channelId,
                    setLastViewed: !fromPushNotification,
                },
                previousChannel: {
                    id: currentChannelId,
                },
            },
        });

        reduxStore.dispatch(setChannelLoadingRedux(false));

        Client4.viewMyChannel(channelId, channelId === currentChannelId ? null : currentChannelId).then().catch((error) => {
            forceLogoutIfNecessary(error);
        });

        return {data: true};
    };
}

export function getProfilesInChannel(channelId, batch = false) {
    return async (dispatch) => {
        try {
            const profiles = await Client4.getProfilesInChannel(channelId);
            const userIds = profiles.map((p) => p.id);
            const statuses = await Client4.getStatusesByIds(userIds);
            const data = {
                channelId,
                profiles,
                statuses,
            };

            if (!batch) {
                dispatch({
                    type: UserTypes.RECEIVED_PROFILES_IN_CHANNEL,
                    data,
                });
            }

            return {data};
        } catch (error) {
            return {error};
        }
    };
}

export function getChannelStats(channelId) {
    return async (dispatch) => {
        let data;

        try {
            data = await Client4.getChannelStats(channelId);
        } catch (error) {
            forceLogoutIfNecessary(error);
            return {error};
        }

        dispatch({
            type: ChannelTypes.RECEIVED_CHANNEL_STATS,
            data,
        });

        return {data};
    };
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from 'mattermost-redux/client';

import {General, Permissions, Preferences, Roles, ViewTypes} from 'app/constants';
import {ChannelTypes, UserTypes} from 'app/realm/action_types';
import {getProfilesByIds} from 'app/realm/actions/user';
import telemetry from 'app/telemetry';
import {
    isDirectMessageVisible,
    isGroupMessageVisible,
    getDirectChannelName,
    getUserIdFromChannelName,
    isOwnDirectMessage,
    sortChannelsByDisplayName,
} from 'app/realm/utils/channel';
import {reducePermissionsToSet} from 'app/realm/utils/role';
import {buildPreference} from 'app/realm/utils/preference';

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

            const creators = new Set();
            channels.forEach((channel) => {
                creators.add(channel.creator_id);
            });
            if (creators.size > 0) {
                dispatch(getProfilesByIds(Array.from(creators)));
            }

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
    return async (dispatch, getState) => {
        const realm = getState();
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        const preferences = realm.objects('Preference');
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
                if (!isDirectMessageVisible(preferences, general.currentUserId, c.name) && myChannelMember?.mentionCount) {
                    prefs.push(buildPreference(Preferences.CATEGORY_DIRECT_CHANNEL_SHOW, currentUserId, teammateId));
                    prefs.push(buildPreference(Preferences.CATEGORY_CHANNEL_OPEN_TIME, currentUserId, c.id, Date.now().toString()));
                }
                break;
            }
            case General.GM_CHANNEL:
                // when then GM is hidden but has new messages
                if (!isGroupMessageVisible(preferences, c.id) && (myChannelMember.mentionCount > 0 || myChannelMember.msgCount < myChannelMember.channels[0].totalMsgCount)) {
                    prefs.push(buildPreference(Preferences.CATEGORY_GROUP_CHANNEL_SHOW, currentUserId, c.id));
                    prefs.push(buildPreference(Preferences.CATEGORY_CHANNEL_OPEN_TIME, currentUserId, c.id, Date.now().toString()));
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
                    promises = failed.map((id) => dispatch(getProfilesInChannel(id, true))); //eslint-disable-line require-atomic-updates
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

export function selectInitialChannel(teamId, lastIndex = 0) {
    return async (dispatch, getState) => {
        const realm = getState();
        reduxStore.dispatch(selectInitialChannelRedux(teamId));

        // We'll use the redux state to get the last channel viewed for the team
        const reduxState = reduxStore.getState();
        const lastChannelForTeam = reduxState.views.team.lastChannelForTeam[teamId];
        const lastChannelId = lastChannelForTeam && lastChannelForTeam.length ? lastChannelForTeam[lastIndex] : '';
        const lastChannel = realm.objectForPrimaryKey('Channel', lastChannelId);
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);

        const isDirectChannel = lastChannel?.type === General.DM_CHANNEL || lastChannel?.type === General.GM_CHANNEL;
        const isMember = lastChannel?.members.filtered('user.id=$0', general.currentUserId);

        if (isMember?.length && (lastChannel?.team?.id === teamId || isDirectChannel)) {
            return dispatch(handleSelectChannel(lastChannelId, teamId));
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
            const canIJoinPublicChannelsInTeam = permissions.has(Permissions.JOIN_PUBLIC_CHANNELS);

            let channel;
            if (iAmMemberOfTheTeamDefaultChannel || canIJoinPublicChannelsInTeam) {
                channel = defaultChannel[0];
            } else {
                channel = channelsInTeam.filtered('members.user.id=$0', currentUser.id).
                    map((c) => c).
                    sort(sortChannelsByDisplayName.bind(null, currentUser.locale))[0];
            }

            if (channel) {
                return dispatch(handleSelectChannel(channel.id, teamId));
            }

            return {error: 'no default channel for this team'};
        } catch (error) {
            return {error};
        }
    };
}

export function handleSelectChannel(channelId, teamId, fromPushNotification = false) {
    return async (dispatch, getState) => {
        reduxStore.dispatch(handleSelectChannelRedux(channelId, fromPushNotification));
        const realm = getState();
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        const currentChannelId = general.currentChannelId;

        let currentChannel = null;
        if (currentChannelId) {
            currentChannel = realm.objectForPrimaryKey('Channel', currentChannelId);
        }

        const lastTeamId = teamId || currentChannel?.team?.id || general.currentTeamId;

        // If the app is open from push notification, we already fetched the posts.
        if (!fromPushNotification) {
            dispatch(loadPostsWithRetry(channelId));
        }

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

export function getChannel(channelId) {
    return async (dispatch) => {
        let data;
        try {
            data = await Client4.getChannel(channelId);
        } catch (error) {
            forceLogoutIfNecessary(error);
            return {error};
        }

        dispatch({
            type: ChannelTypes.RECEIVED_CHANNEL,
            data,
        });

        return {data};
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

export function logChannelSwitch(channelId, currentChannelId) {
    return (dispatch, getState) => {
        if (channelId === currentChannelId) {
            return;
        }

        const metrics = [];
        const realm = getState();
        const postsInChannel = realm.objects('Post').filtered('channelId = $0', channelId);
        if (postsInChannel.isEmpty()) {
            metrics.push('channel:switch_initial');
        } else {
            metrics.push('channel:switch_loaded');
        }

        telemetry.reset();
        telemetry.start(metrics);
    };
}

export function joinChannel(userId, teamId, channelId, channelName) {
    return async (dispatch) => {
        let member;
        let channel;

        try {
            if (channelId) {
                member = await Client4.addToChannel(userId, channelId);
                channel = await Client4.getChannel(channelId);
            } else if (channelName) {
                channel = await Client4.getChannelByName(teamId, channelName, true);
                if ((channel.type === General.GM_CHANNEL) || (channel.type === General.DM_CHANNEL)) {
                    member = await Client4.getChannelMember(channel.id, userId);
                } else {
                    member = await Client4.addToChannel(userId, channel.id);
                }
            }
        } catch (error) {
            forceLogoutIfNecessary(error);
            return {error};
        }

        Client4.trackEvent('action', 'action_channels_join', {channel_id: channelId});

        dispatch({
            type: ChannelTypes.RECEIVED_CHANNEL_AND_MEMBER,
            data: {
                channel,
                member,
            },
        });

        if (member) {
            dispatch(loadRolesIfNeeded(member.roles.split(' ')));
        }

        return {data: {channel, member}};
    };
}

export function makeDirectChannel(otherUserId, switchToChannel = true) {
    return async (dispatch, getState) => {
        const realm = getState();
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        const channelName = getDirectChannelName(general.currentUserId, otherUserId);

        dispatch(getProfilesByIds([otherUserId]));

        let result;
        let channel = realm.objects('Channel').filtered('name = $0', channelName)[0];
        if (channel?.members?.length) {
            result = {data: channel};

            dispatch(showDirectChannelIfNecessary(channel.id, otherUserId));
        } else {
            result = await dispatch(createDirectChannel(otherUserId));
            channel = result.data;
        }

        if (channel && switchToChannel) {
            dispatch(handleSelectChannel(channel.id));
        }

        return result;
    };
}

export function showDirectChannelIfNecessary(channelId, otherUserId) {
    return async (dispatch, getState) => {
        const realm = getState();
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        const preferences = realm.objects('Preference');
        const currentUserId = general.currentUserId;
        const channelName = getDirectChannelName(currentUserId, otherUserId);
        if (!isDirectMessageVisible(preferences, currentUserId, channelName)) {
            const prefs = [
                buildPreference(Preferences.CATEGORY_DIRECT_CHANNEL_SHOW, currentUserId, otherUserId),
                buildPreference(Preferences.CATEGORY_CHANNEL_OPEN_TIME, currentUserId, channelId, Date.now().toString()),
            ];
            dispatch(savePreferences(currentUserId, prefs));
        }

        return {data: true};
    };
}

export function createDirectChannel(otherUserId) {
    return async (dispatch, getState) => {
        const realm = getState();
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        const currentUserId = general.currentUserId;

        let channel;
        try {
            channel = await Client4.createDirectChannel([currentUserId, otherUserId]);
        } catch (error) {
            forceLogoutIfNecessary(error);
            return {error};
        }

        const prefs = [
            buildPreference(Preferences.CATEGORY_DIRECT_CHANNEL_SHOW, currentUserId, otherUserId),
            buildPreference(Preferences.CATEGORY_CHANNEL_OPEN_TIME, currentUserId, channel.id, Date.now().toString()),
        ];

        const myMember = {
            channel_id: channel.id,
            user_id: currentUserId,
            roles: `${Roles.CHANNEL_USER_ROLE}`,
            last_viewed_at: 0,
            last_update_at: channel.create_at,
            msg_count: 0,
            mention_count: 0,
            notify_props: {desktop: 'default', mark_unread: 'all'},
        };

        const members = [myMember, {...myMember, user_id: otherUserId}];
        await dispatch({
            type: ChannelTypes.CREATE_DIRECT_CHANNEL,
            data: {
                channel,
                members,
            },
        });
        dispatch(savePreferences(currentUserId, prefs));

        return {data: channel};
    };
}

export function closeDirectChannel(channel) {
    return async (dispatch, getState) => {
        const realm = getState();
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        const currentUserId = general.currentUserId;
        const currentChannelId = general.currentChannelId;
        const prefs = [];

        switch (channel.type) {
        case General.DM_CHANNEL: {
            const teammateId = getUserIdFromChannelName(currentUserId, channel.name);
            prefs.push(buildPreference(Preferences.CATEGORY_DIRECT_CHANNEL_SHOW, currentUserId, teammateId, 'false'));
            break;
        }
        case General.GM_CHANNEL:
            prefs.push(buildPreference(Preferences.CATEGORY_GROUP_CHANNEL_SHOW, currentUserId, currentChannelId, 'false'));
            break;
        }

        if (prefs.length) {
            dispatch(savePreferences(currentUserId, prefs));

            if (channel.id === currentChannelId) {
                dispatch(selectInitialChannel(general.currentTeamId, 1));
            }
        }

        return {data: true};
    };
}

export function searchChannels(teamId, term) {
    return async (dispatch) => {
        try {
            const channels = await Client4.searchChannels(teamId, term);

            const data = {
                channels,
                teamId,
            };

            dispatch({
                type: ChannelTypes.RECEIVED_CHANNELS,
                data,
            });

            return {data};
        } catch (error) {
            forceLogoutIfNecessary(error);
            return {error};
        }
    };
}

export function convertChannelToPrivate(channelId) {
    return async (dispatch) => {
        let convertedChannel;
        try {
            convertedChannel = await Client4.convertChannelToPrivate(channelId);
        } catch (error) {
            forceLogoutIfNecessary(error);
            return {error};
        }

        dispatch({
            type: ChannelTypes.RECEIVED_CHANNEL,
            data: convertedChannel,
        });

        return {data: convertedChannel};
    };
}

export function deleteChannel(channelId) {
    return async (dispatch) => {
        try {
            await Client4.deleteChannel(channelId);
        } catch (error) {
            forceLogoutIfNecessary(error);
            return {error};
        }

        dispatch({
            type: ChannelTypes.DELETED_CHANNEL,
            data: {id: channelId},
        });

        return {data: true};
    };
}

export function leaveChannel(channel, reset = false) {
    return async (dispatch, getState) => {
        const realm = getState();
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        const {currentUserId, currentChannelId, currentTeamId} = general;

        Client4.trackEvent('action', 'action_channels_leave', {channel_id: channel.id});

        try {
            await Client4.removeFromChannel(currentUserId, channel.id);
        } catch (error) {
            forceLogoutIfNecessary(error);
            return {error};
        }

        reduxStore.dispatch({
            type: ViewTypes.REMOVE_LAST_CHANNEL_FOR_TEAM,
            data: {
                teamId: currentTeamId,
                channelId: channel.id,
            },
        });

        if (channel.id === currentChannelId || reset) {
            await dispatch(selectInitialChannel(currentTeamId));
        }

        setTimeout(() => {
            // Dispathing after one second so that it gives enough time
            // to transitions screens and switching channels etc before removing
            // the element from the database so realm does not complain about trying to access
            // a previously deleted element
            dispatch({
                type: ChannelTypes.LEAVE_CHANNEL,
                data: {
                    id: channel.id,
                    userId: currentUserId,
                },
            });
        }, 1000);

        return {data: true};
    };
}

export function loadChannelsByTeamName(teamName) {
    return async (dispatch, getState) => {
        const realm = getState();
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);

        const {currentTeamId} = general;
        const team = realm.objects('Team').filtered('name = $0', teamName)[0];

        if (team && team.id !== currentTeamId) {
            await dispatch(loadChannelsForTeam(team.id));
        }
    };
}

export function markChannelAsFavorite(channeId, favorite = true) {
    return async (dispatch, getState) => {
        const realm = getState();
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        const favoritePref = realm.objectForPrimaryKey('Preference', `${Preferences.CATEGORY_FAVORITE_CHANNEL}-${channeId}`);
        const prefs = [];

        if (favorite && (!favoritePref || favoritePref.value === 'false')) {
            prefs.push(buildPreference(Preferences.CATEGORY_FAVORITE_CHANNEL, general.currentUserId, channeId));
        } else if (!favorite) {
            prefs.push(buildPreference(Preferences.CATEGORY_FAVORITE_CHANNEL, general.currentUserId, channeId, 'false'));
        }

        return dispatch(savePreferences(general.currentUserId, prefs));
    };
}

export function updateChannelNotifyProps(userId, channelId, props) {
    return async (dispatch, getState) => {
        const notifyProps = {
            user_id: userId,
            channel_id: channelId,
            ...props,
        };

        try {
            await Client4.updateChannelNotifyProps(notifyProps);
        } catch (error) {
            forceLogoutIfNecessary(error);

            return {error};
        }

        const realm = getState();
        const member = realm.objectForPrimaryKey('ChannelMember', `${channelId}-${userId}`);
        const currentNotifyProps = member?.notifyPropsAsJSON;

        dispatch({
            type: ChannelTypes.RECEIVED_CHANNEL_PROPS,
            data: {
                id: channelId,
                userId,
                notifyProps: {...currentNotifyProps, ...notifyProps},
            },
        });

        return {data: true};
    };
}

export function patchChannel(channelId, patch) {
    return async (dispatch) => {
        let updated;
        try {
            updated = await Client4.patchChannel(channelId, patch);
        } catch (error) {
            forceLogoutIfNecessary(error);

            return {error};
        }

        dispatch({
            type: ChannelTypes.RECEIVED_CHANNEL,
            data: updated,
        });

        return {data: updated};
    };
}
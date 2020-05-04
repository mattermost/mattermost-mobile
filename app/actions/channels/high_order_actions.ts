// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@mm-redux/client';
import {General, Preferences} from '@mm-redux/constants';

import {Action, ActionFunc, DispatchFunc, GetStateFunc, batchActions} from '@mm-redux/types/actions';
import {Channel, ChannelMembership} from '@mm-redux/types/channels';

import {loadRolesIfNeeded} from '@mm-redux/actions/roles';
import {
    savePreferences,
    deletePreferences,
} from '@mm-redux/actions/preferences';

import {
    getChannel as selectChannel,
    getMyChannelMember as selectMyChannelMember,
    isManuallyUnread,
} from '@mm-redux/selectors/entities/channels';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {getCurrentTeamId, getTeamByName} from '@mm-redux/selectors/entities/teams';

import {
    receivedMyChannelMember,
    removeManuallyUnread,
    incrementTotalMessageCount,
    incrementUnreadMessageCount,
    incrementUnreadMentionCount,
    getMyChannelsAndMembersForTeam,
    addChannelMember,
    removeChannelMember,
} from '@actions/channels';
import {
    loadDirectMessagesActions,
    markChannelAsViewedAndReadActions,
} from '@actions/helpers/channels';
import {buildPreference} from '@utils/preferences';

export function getChannelsByTeamName(teamName: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const currentTeamId = getCurrentTeamId(state);
        const team = getTeamByName(state, teamName);

        if (!team) {
            return {error: `Team with name ${teamName} not found.`};
        }

        if (team.id !== currentTeamId) {
            dispatch(getMyChannelsAndMembersForTeam(team.id));
        }
    
        return {data: true}
    };
}

export function markChannelAsUnread(channelId: string, mentions: Array<string>): ActionFunc {
    // Increments the number of posts in the channel by 1 and marks it as unread if necessary
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const currentUserId = getCurrentUserId(state);
        const channel = selectChannel(state, channelId);
        const member = selectMyChannelMember(state, channelId);

        const onlyMentions = member?.notify_props?.mark_unread === General.MENTION;

        const actions: Action[] = [
            incrementTotalMessageCount(channel.id, 1),
            incrementUnreadMessageCount(channel, 1, onlyMentions),
        ];

        if (mentions?.length && mentions.indexOf(currentUserId) !== -1) {
            actions.push(incrementUnreadMentionCount(channel, 1));
        }

        dispatch(batchActions(actions));

        return {data: true};
    };
}

export function markChannelViewedAndRead(channelId: string, previousChannelId: string = '', markOnServer: boolean = true): ActionFunc {
    return (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const actions = markChannelAsViewedAndReadActions(state, channelId, previousChannelId, markOnServer);

        dispatch(batchActions(actions, 'BATCH_MARK_CHANNEL_VIEWED_AND_READ'));

        return {data: true};
    };
}

export function favoriteChannel(channelId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const currentUserId = getCurrentUserId(state);
        const preference = buildPreference(Preferences.CATEGORY_FAVORITE_CHANNEL, currentUserId, channelId, 'true');

        Client4.trackEvent('action', 'action_channels_favorite');

        return dispatch(savePreferences(currentUserId, [preference]));
    };
}

export function unfavoriteChannel(channelId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const currentUserId = getCurrentUserId(state);
        const preference = buildPreference(Preferences.CATEGORY_FAVORITE_CHANNEL, currentUserId, channelId, '');

        Client4.trackEvent('action', 'action_channels_unfavorite');

        return dispatch(deletePreferences(currentUserId, [preference]));
    };
}

export function markChannelAsViewed(channelId: string, prevChannelId = ''): ActionFunc {
    return (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const actions: Action[] = [];

        const member = selectMyChannelMember(state, channelId);
        if (member) {
            dispatch(loadRolesIfNeeded(member.roles.split(' ')));

            member.last_viewed_at = Date.now();
            actions.push(receivedMyChannelMember(member));

            if (isManuallyUnread(state, channelId)) {
                actions.push(removeManuallyUnread(channelId));
            }
        }

        const prevMember = selectMyChannelMember(state, prevChannelId);
        if (prevMember && !isManuallyUnread(state, prevChannelId)) {
            dispatch(loadRolesIfNeeded(prevMember.roles.split(' ')));

            prevMember.last_viewed_at = Date.now();
            actions.push(receivedMyChannelMember(prevMember));
        }

        if (actions.length) {
            dispatch(batchActions(actions));
        }

        return {data: true};
    };
}

export function addMultipleChannelMembers(channelId: string, userIds: string[]): ActionFunc {
    return async (dispatch: DispatchFunc) => {
        try {
            const requests = userIds.map((userId) => {
                return dispatch(addChannelMember(channelId, userId));
            });

            const results = await Promise.all(requests);
            return results;
        } catch (error) {
            return error;
        }
    };
}

export function removeMultipleChannelMembers(channelId: string, userIds: string[]) {
    return async (dispatch: DispatchFunc) => {
        try {
            const requests = userIds.map((userId) => {
                return dispatch(removeChannelMember(channelId, userId));
            });

            const results = await Promise.all(requests);
            return results;
        } catch (error) {
            return error;
        }
    };
}

export function loadDirectMessages(channels: Channel[], channelMembers: ChannelMembership[]): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();

        const actions = await loadDirectMessagesActions(state, channels, channelMembers);
        if (actions.length) {
            dispatch(batchActions(actions, 'BATCH_LOAD_DIRECT_MESSAGES'));
        }

        return {data: true};
    };
}
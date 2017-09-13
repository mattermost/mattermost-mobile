// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {ViewTypes} from 'app/constants';
import {
    handleSelectChannel,
    setChannelDisplayName
} from 'app/actions/views/channel';
import {handleTeamChange, selectFirstAvailableTeam} from 'app/actions/views/select_team';

import {General} from 'mattermost-redux/constants';
import {getClientConfig, getLicenseConfig} from 'mattermost-redux/actions/general';
import {getChannelAndMyMember, markChannelAsRead, viewChannel} from 'mattermost-redux/actions/channels';

export function loadConfigAndLicense() {
    return async (dispatch, getState) => {
        const [config, license] = await Promise.all([
            getClientConfig()(dispatch, getState),
            getLicenseConfig()(dispatch, getState)
        ]);

        return {config, license};
    };
}

export function queueNotification(notification) {
    return async (dispatch, getState) => {
        dispatch({type: ViewTypes.NOTIFICATION_CHANGED, data: notification}, getState);
    };
}

export function clearNotification() {
    return async (dispatch, getState) => {
        dispatch({type: ViewTypes.NOTIFICATION_CHANGED, data: null}, getState);
    };
}

export function goToNotification(notification) {
    return async (dispatch, getState) => {
        const state = getState();
        const {data} = notification;
        const {currentTeamId, teams} = state.entities.teams;
        const {channels, currentChannelId, myMembers} = state.entities.channels;
        const channelId = data.channel_id;

        // if the notification does not have a team id is because its from a DM or GM
        const teamId = data.team_id || currentTeamId;

        dispatch(setChannelDisplayName(''));

        if (teamId && teamId !== currentTeamId) {
            handleTeamChange(teams[teamId], false)(dispatch, getState);
        } else if (!teamId) {
            await selectFirstAvailableTeam()(dispatch, getState);
        }

        if (!channels[channelId] || !myMembers[channelId]) {
            getChannelAndMyMember(channelId)(dispatch, getState);
        }

        if (channelId !== currentChannelId) {
            handleSelectChannel(channelId)(dispatch, getState);
        }

        viewChannel(channelId)(dispatch, getState);

        markChannelAsRead(channelId, currentChannelId)(dispatch, getState);
    };
}

export function setStatusBarHeight(height = 20) {
    return {
        type: ViewTypes.STATUSBAR_HEIGHT_CHANGED,
        data: height
    };
}

export function purgeOfflineStore() {
    return {type: General.OFFLINE_STORE_PURGE};
}

export default {
    loadConfigAndLicense,
    queueNotification,
    clearNotification,
    goToNotification,
    setStatusBarHeight
};

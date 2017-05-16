// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {ViewTypes} from 'app/constants';
import {
    handleSelectChannel,
    loadChannelsIfNecessary,
    loadProfilesAndTeamMembersForDMSidebar
} from 'app/actions/views/channel';
import {handleTeamChange, selectFirstAvailableTeam} from 'app/actions/views/select_team';

import {getClientConfig, getLicenseConfig, setServerVersion} from 'mattermost-redux/actions/general';
import {markChannelAsRead, viewChannel} from 'mattermost-redux/actions/channels';

export function loadConfigAndLicense(serverVersion) {
    return async (dispatch, getState) => {
        getClientConfig()(dispatch, getState);
        getLicenseConfig()(dispatch, getState);
        setServerVersion(serverVersion)(dispatch, getState);
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
        const channelId = data.channel_id;

        // if the notification does not have a team id is because its from a DM or GM
        let teamId = data.team_id || currentTeamId;

        if (teamId) {
            handleTeamChange(teams[teamId])(dispatch, getState);
            await loadChannelsIfNecessary(teamId)(dispatch, getState);
        } else {
            await selectFirstAvailableTeam()(dispatch, getState);
            teamId = currentTeamId;
        }

        viewChannel(channelId)(dispatch, getState);
        loadProfilesAndTeamMembersForDMSidebar(teamId)(dispatch, getState);

        // when the notification is tapped go to the channel view before selecting the channel to prevent
        // weird behavior
        handleSelectChannel(channelId)(dispatch, getState);
        markChannelAsRead(teamId, channelId)(dispatch, getState).then(() => true).catch(() => true);
    };
}

export default {
    loadConfigAndLicense,
    queueNotification,
    clearNotification,
    goToNotification
};

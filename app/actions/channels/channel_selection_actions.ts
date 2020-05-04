// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionFunc, DispatchFunc, GetStateFunc, batchActions} from '@mm-redux/types/actions';

import EventEmitter from '@mm-redux/utils/event_emitter';

import {getCurrentTeamId, getTeamByName} from '@mm-redux/selectors/entities/teams';
import {
    getChannel,
    getChannelByName,
    getMyChannelMember,
    getCurrentChannelId,
    getRedirectChannelForTeam,
} from '@mm-redux/selectors/entities/channels';

import {selectTeam} from '@mm-redux/actions/teams';
import {selectChannel} from '@actions/channels';
import {markChannelAsViewedAndReadActions} from '@actions/helpers/channels';
import {loadPostsIfNecessaryWithRetry} from '@actions/views/post';

import {
    getLastViewedChannelForTeam,
    getPenultimateViewedChannelForTeam,
} from '@selectors/views';

import {DEFAULT_CHANNEL_NOT_FOUND} from '@constants/channel';

import {canSelectChannel} from '@utils/users';
import {t} from '@utils/i18n';

// Functions in this module will call `_handleSelectChannel` instead of `handleSelectChannel`
// and `_selectRedirectChannelForTeam` instead of `selectRedirectChannelForTeam` so that
// `handleSelectChannel` and `selectRedirectChannelForTeam can be mocked in unit tests.
import {
    handleSelectChannel as _handleSelectChannel,
    selectRedirectChannelForTeam as _selectRedirectChannelForTeam,
} from './channel_selection_actions';

export function handleSelectChannel(channelId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const dt = Date.now();

        const state = getState();
        const currentChannelId = getCurrentChannelId(state);
        if (channelId === currentChannelId) {
            return {data: false};
        }

        dispatch(loadPostsIfNecessaryWithRetry(channelId));

        const channel = getChannel(state, channelId);
        if (!channel) {
            return {data: false};
        }

        const member = getMyChannelMember(state, channelId);
        const currentTeamId = getCurrentTeamId(state);
        const extra = {
            channel,
            member,
            teamId: channel.team_id || currentTeamId,
        };

        const actions = [
            ...markChannelAsViewedAndReadActions(state, channelId, currentChannelId),
            selectChannel(channelId, extra),
        ];
        dispatch(batchActions(actions, 'BATCH_SWITCH_CHANNEL'));

        console.log('channel switch to', channel?.display_name, channelId, (Date.now() - dt), 'ms'); //eslint-disable-line

        return {data: true};
    };
}

export function selectRedirectChannelForTeam(teamId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const channel = getRedirectChannelForTeam(state, teamId);

        if (!channel) { 
            const error = {
                id: t('mobile.default_channel.error'),
                defaultMessage: 'A default channel for this team was not found.',
            };
            EventEmitter.emit(DEFAULT_CHANNEL_NOT_FOUND, error);

            return {error};
        }

        dispatch(_handleSelectChannel(channel.id));

        return {data: true};
    };
}

export function selectChannelFromDeepLinkMatch(channelName: string, teamName: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let error;
        const state = getState();

        const team = getTeamByName(state, teamName);
        if (!team) {
            error = {
                id: t('mobile.server_link.unreachable_team.error'),
                defaultMessage: 'This link belongs to a deleted team or to a team to which you do not have access.',
            };

            return {error};
        }
    
        const channel = getChannelByName(state, channelName);
        if (!channel) {
            error = {
                id: t('mobile.server_link.unreachable_channel.error'),
                defaultMessage: 'This link belongs to a deleted channel or to a channel to which you do not have access.',
            };

            return {error};
        }

        if (channel && channel.team_id !== team.id) {
            error = {
                id: t('mobile.server_link.error.text'),
                defaultMessage: 'The link could not be found on this server.',
            }

            return {error};
        }

        const currentChannelId = getCurrentChannelId(state);
        const currentTeamId = getCurrentTeamId(state);
        if (channel.id !== currentChannelId) {
            if (team.id !== currentTeamId) {
                dispatch(selectTeam(team));
            }

            dispatch(_handleSelectChannel(channel.id));
        }

        return {data: true};
    };
}

export function selectLastViewedChannelForTeam(teamId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        let channel = getLastViewedChannelForTeam(state, teamId);

        if (channel && canSelectChannel(state, channel)) {
            dispatch(_handleSelectChannel(channel.id));
        } else {
            dispatch(_selectRedirectChannelForTeam(teamId));
        }

        return {data: true};
    };
}

export function selectPenultimateViewedChannelForTeam(teamId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        let channel = getPenultimateViewedChannelForTeam(state, teamId);

        if (channel && canSelectChannel(state, channel)) {
            dispatch(_handleSelectChannel(channel.id));
        } else {
            dispatch(_selectRedirectChannelForTeam(teamId));
        }

        return {data: true};
    };
}

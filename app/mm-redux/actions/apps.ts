// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@client/rest';
import {AppsTypes} from '@mm-redux/action_types';
import {getChannel} from '@mm-redux/selectors/entities/channels';
import {ActionFunc, DispatchFunc, GetStateFunc} from '@mm-redux/types/actions';

import {bindClientFunc} from './helpers';

export function fetchAppBindings(userID: string, channelID: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const channel = getChannel(getState(), channelID);
        const teamID = channel?.team_id || '';

        return dispatch(bindClientFunc({
            clientFunc: () => Client4.getAppsBindings(userID, channelID, teamID),
            onSuccess: AppsTypes.RECEIVED_APP_BINDINGS,
            onFailure: AppsTypes.CLEAR_APP_BINDINGS,
        }));
    };
}

export function fetchThreadAppBindings(userID: string, channelID: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const channel = getChannel(getState(), channelID);
        const teamID = channel?.team_id || '';

        return dispatch(bindClientFunc({
            clientFunc: async () => {
                const bindings = await Client4.getAppsBindings(userID, channelID, teamID);
                return {bindings, channelID};
            },
            onSuccess: AppsTypes.RECEIVED_THREAD_APP_BINDINGS,
            onRequest: AppsTypes.CLEAR_THREAD_APP_BINDINGS,
        }));
    };
}

export function clearThreadAppBindings() {
    return {
        type: AppsTypes.CLEAR_THREAD_APP_BINDINGS,
        data: true,
    };
}

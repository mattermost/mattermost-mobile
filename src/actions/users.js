// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {batchActions} from 'redux-batched-actions';

import Client from 'client';

// TODO: uncomment when PLT-4167 is merged
// import {UsersTypes, TeamsTypes} from 'constants';
import {UsersTypes} from 'constants';
import {bindClientFunc} from 'actions/helpers';

export function login(loginId, password, mfaToken = '') {
    return async (dispatch, getState) => {
        dispatch({type: UsersTypes.LOGIN_REQUEST}, getState);
        Client.login(loginId, password, mfaToken).
        then(async (data) => {
            try {
                const preferences = Client.getMyPreferences();

                // TODO: uncomment when PLT-4167 is merged
                // const teamMembers = Client.getMyTeamMembers();
                dispatch(batchActions([
                    {
                        type: UsersTypes.RECEIVED_ME,
                        data
                    },
                    {
                        type: UsersTypes.RECEIVED_PREFERENCES,
                        data: await preferences
                    },

                    // TODO: uncomment when PLT-4167 is merged
                    // {
                    //     type: TeamsTypes.RECEIVED_MY_TEAM_MEMBERS,
                    //     data: await teamMembers
                    // },
                    {
                        type: UsersTypes.LOGIN_SUCCESS
                    }
                ]), getState);
            } catch (err) {
                console.error(err); // eslint-disable-line no-console
                dispatch({type: UsersTypes.LOGIN_FAILURE, error: err}, getState);
            }
        }).
        catch((err) => {
            dispatch({type: UsersTypes.LOGIN_FAILURE, error: err}, getState);
        });
    };
}

export function logout() {
    return bindClientFunc(
        Client.logout,
        UsersTypes.LOGOUT_REQUEST,
        UsersTypes.LOGOUT_SUCCESS,
        UsersTypes.LOGOUT_FAILURE
    );
}

export default {
    login,
    logout
};

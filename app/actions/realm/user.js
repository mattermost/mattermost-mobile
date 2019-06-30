// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from 'mattermost-redux/client';

import {UserTypes} from 'app/action_types';
import ephemeralStore from 'app/store/ephemeral_store';

import {forceLogoutIfNecessary} from './helpers';

export function loadMe() {
    return async (dispatch) => {
        try {
            let user;
            try {
                const [me, status] = await Promise.all([
                    Client4.getMe(),
                    Client4.getStatus('me'),
                ]);

                user = {
                    ...me,
                    status: status.status,
                };

                if (ephemeralStore.deviceToken) {
                    Client4.attachDevice(ephemeralStore.deviceToken);
                }
            } catch (e) {
                forceLogoutIfNecessary(e);
                return {error: e};
            }

            const [preferences, teams, teamMembers, teamUnreads] = await Promise.all([
                Client4.getMyPreferences(),
                Client4.getMyTeams(),
                Client4.getMyTeamMembers(),
                Client4.getMyTeamUnreads(),
            ]);

            const data = {
                user,
                preferences,
                teams,
                teamMembers,
                teamUnreads,
            };

            dispatch({
                type: UserTypes.RECEIVED_ME,
                data,
            });

            Client4.setUserId(user.id);
            Client4.setUserRoles(user.roles);

            return data;
        } catch (error) {
            return {error};
        }
    };
}

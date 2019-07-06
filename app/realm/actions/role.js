// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from 'mattermost-redux/client';

import {RoleTypes} from 'app/realm/action_types';

import {forceLogoutIfNecessary} from './helpers';

export function getRolesByNames(roleNames = []) {
    return async (dispatch) => {
        try {
            const data = await Client4.getRolesByNames(roleNames);
            dispatch({
                type: RoleTypes.RECEIVED_ROLES,
                data,
            });

            return {data};
        } catch (error) {
            forceLogoutIfNecessary(error);
            return {error};
        }
    };
}

export function loadRolesIfNeeded(pendingRoles) {
    return async (dispatch, getState) => {
        const state = getState();
        const loadedRoles = state.objects('Role').filtered('deleteAt = 0').map((r) => r.name);
        const newRoles = new Set();

        for (const role of pendingRoles) {
            if (!loadedRoles.includes(role) && role.trim()) {
                newRoles.add(role);
            }
        }

        if (newRoles.size > 0) {
            return dispatch(getRolesByNames(Array.from(newRoles)));
        }

        return {data: loadedRoles};
    };
}

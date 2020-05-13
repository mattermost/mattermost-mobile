// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Client4} from '@mm-redux/client';
import {RoleTypes} from '@mm-redux/action_types';
import {getRoles} from '@mm-redux/selectors/entities/roles_helpers';

import {DispatchFunc, GetStateFunc, ActionFunc} from '@mm-redux/types/actions';
import {Role} from '@mm-redux/types/roles';

import {bindClientFunc} from './helpers';
export function getRolesByNames(rolesNames: Array<string>) {
    return bindClientFunc({
        clientFunc: Client4.getRolesByNames,
        onRequest: RoleTypes.ROLES_BY_NAMES_REQUEST,
        onSuccess: [RoleTypes.RECEIVED_ROLES, RoleTypes.ROLES_BY_NAMES_SUCCESS],
        onFailure: RoleTypes.ROLES_BY_NAMES_FAILURE,
        params: [
            rolesNames,
        ],
    });
}

export function getRoleByName(roleName: string) {
    return bindClientFunc({
        clientFunc: Client4.getRoleByName,
        onRequest: RoleTypes.ROLE_BY_NAME_REQUEST,
        onSuccess: [RoleTypes.RECEIVED_ROLE, RoleTypes.ROLE_BY_NAME_SUCCESS],
        onFailure: RoleTypes.ROLE_BY_NAME_FAILURE,
        params: [
            roleName,
        ],
    });
}

export function getRole(roleId: string) {
    return bindClientFunc({
        clientFunc: Client4.getRole,
        onRequest: RoleTypes.ROLE_BY_ID_REQUEST,
        onSuccess: [RoleTypes.RECEIVED_ROLE, RoleTypes.ROLE_BY_ID_SUCCESS],
        onFailure: RoleTypes.ROLE_BY_ID_FAILURE,
        params: [
            roleId,
        ],
    });
}

export function editRole(role: Role) {
    return bindClientFunc({
        clientFunc: Client4.patchRole,
        onRequest: RoleTypes.EDIT_ROLE_REQUEST,
        onSuccess: [RoleTypes.RECEIVED_ROLE, RoleTypes.EDIT_ROLE_SUCCESS],
        onFailure: RoleTypes.EDIT_ROLE_FAILURE,
        params: [
            role.id,
            role,
        ],
    });
}

export function loadRolesIfNeeded(roles: Iterable<string>): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const currentRoles = getRoles(state);
        const newRoles = [];

        for (const role of roles) {
            if (!currentRoles[role] && role.trim() !== '') {
                newRoles.push(role);
            }
        }
        if (newRoles.length > 0) {
            return dispatch(getRolesByNames(newRoles));
        }
        return {data: state.entities.roles.roles};
    };
}

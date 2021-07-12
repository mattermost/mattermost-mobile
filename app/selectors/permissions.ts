// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

import {Permissions} from '@mm-redux/constants';
import {getCurrentUser} from '@mm-redux/selectors/entities/common';
import {getMyChannelRoles, getMySystemPermissions, getMyTeamRoles, getRoles} from '@mm-redux/selectors/entities/roles';
import {isPostOwner} from '@mm-redux/utils/post_utils';

import type {Post} from '@mm-redux/types/posts';
import type {GlobalState} from '@mm-redux/types/store';

export const getMyTeamPermissions = createSelector(
    getMyTeamRoles,
    getRoles,
    getMySystemPermissions,
    (state: GlobalState, team_id: string) => team_id,
    (myTeamRoles, roles, systemPermissions, teamId) => {
        const permissions = new Set<string>();
        let roleFound = false;
        if (myTeamRoles[teamId!]) {
            for (const roleName of myTeamRoles[teamId!]) {
                if (roles[roleName]) {
                    for (const permission of roles[roleName].permissions) {
                        permissions.add(permission);
                    }
                    roleFound = true;
                }
            }
        }
        for (const permission of systemPermissions) {
            permissions.add(permission);
        }
        return {permissions, roleFound};
    },
);

export const getMyChannelPermissions = createSelector(
    getMyChannelRoles,
    getRoles,
    getMyTeamPermissions,
    (_, team_id: string) => team_id,
    (_, __, channel_id: string) => channel_id,
    (myChannelRoles, roles, {permissions: teamPermissions, roleFound: teamRoleFound}, team_id, channel_id) => {
        const permissions = new Set<string>();
        let roleFound = false;
        if (myChannelRoles[channel_id!]) {
            for (const roleName of myChannelRoles[channel_id!]) {
                if (roles[roleName]) {
                    for (const permission of roles[roleName].permissions) {
                        permissions.add(permission);
                    }
                    roleFound = teamRoleFound || !team_id;
                }
            }
        }
        for (const permission of teamPermissions) {
            permissions.add(permission);
        }
        return {permissions, roleFound};
    },
);

export const canDeletePost = createSelector(
    getCurrentUser,
    getMyChannelPermissions,
    (state, _, __, post: Post) => post,
    (state, _, __, ___, defaultValue: boolean) => defaultValue,
    (currentUser, roles, post, defaultValue) => {
        if (!post) {
            return false;
        }

        const isOwner = isPostOwner(currentUser.id, post);
        const permission = isOwner ? Permissions.DELETE_POST : Permissions.DELETE_OTHERS_POSTS;
        const hasPermission = roles.permissions.has(permission);
        if (roles.roleFound) {
            return hasPermission;
        }

        return hasPermission || defaultValue;
    },
);

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Use this function as the callback of an Array.prototype.reduce with an array of roles
export function reducePermissionsToSet(result, role) {
    if (this.includes(role.name)) {
        role.permissions.forEach((p) => result.add(p));
    }

    return result;
}

export function mergeRoles(user, channelMember, teamMember) {
    let roles = '';

    if (teamMember?.roles) {
        roles += `${teamMember.roles} `;
    }

    if (channelMember?.roles) {
        roles += `${channelMember.roles} `;
    }

    if (user?.roles) {
        roles += user.roles;
    }

    return roles.trim().split(' ');
}

export function havePermission(roles, myRoles, permission) {
    const permissions = roles.reduce(reducePermissionsToSet.bind(myRoles), new Set());
    if (permissions?.length) {
        return permissions.has(permission);
    }

    // defaults to true
    return true;
}

export function haveRole(userRoles, role) {
    if (userRoles) {
        const parts = userRoles.split(' ');
        for (let i = 0; i < parts.length; i++) {
            if (parts[i] === role) {
                return true;
            }
        }
    }

    return false;
}


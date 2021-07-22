// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';

export function getUserIdFromChannelName(userId: string, channelName: string): string {
    const ids = channelName.split('__');
    if (ids[0] === userId) {
        return ids[1];
    }
    return ids[0];
}

export function rolesIncludePermission(roles: string, permission: string): boolean {
    const rolesArray = roles.split(' ');
    return rolesArray.includes(permission);
}

export function isAdmin(roles: string): boolean {
    return isSystemAdmin(roles) || isTeamAdmin(roles);
}

export function isGuest(roles: string): boolean {
    return rolesIncludePermission(roles, 'system_guest');
}

export function isTeamAdmin(roles: string): boolean {
    return rolesIncludePermission(roles, General.TEAM_ADMIN_ROLE);
}

export function isSystemAdmin(roles: string): boolean {
    return rolesIncludePermission(roles, General.SYSTEM_ADMIN_ROLE);
}

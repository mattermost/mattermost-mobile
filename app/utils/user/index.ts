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

export function isRoleInRoles(roles: string, role: string): boolean {
    const rolesArray = roles.split(' ');
    return rolesArray.includes(role);
}

export function isGuest(roles: string): boolean {
    return isRoleInRoles(roles, General.SYSTEM_GUEST_ROLE);
}

export function isSystemAdmin(roles: string): boolean {
    return isRoleInRoles(roles, General.SYSTEM_ADMIN_ROLE);
}

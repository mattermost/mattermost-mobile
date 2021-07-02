// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';

export function rolesIncludePermission(roles: string, permission: string): boolean {
    const rolesArray = roles.split(' ');
    return rolesArray.includes(permission);
}

//todo: add testscripts
export function isSystemAdmin(roles: string): boolean {
    return rolesIncludePermission(roles, General.SYSTEM_ADMIN_ROLE);
}


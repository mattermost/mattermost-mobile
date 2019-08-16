// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function reducePermissionsToSet(result, role) {
    if (this.includes(role.name)) {
        role.permissions.forEach((p) => result.add(p));
    }

    return result;
}

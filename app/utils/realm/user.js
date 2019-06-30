// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function userDataToRealm(user) {
    return {
        id: user.id,
        createAt: user.create_at,
        updateAt: user.update_at,
        deleteAt: user.delete_at,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        firstName: user.first_name,
        lastName: user.last_name,
        roles: user.roles,
        notifyProps: JSON.stringify(user.notify_props),
        locale: user.locale,
        position: user.position,
        timezone: JSON.stringify(user.timezone),
        lastPictureUpdate: user.last_picture_update,
        status: user.status,
    };
}

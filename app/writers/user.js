// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineWriters} from 'realm-react-redux';

import {UserTypes} from 'mattermost-redux/action_types';

function currentUser(realm, action) {
    switch (action.type) {
    case UserTypes.RECEIVED_ME: {
        const data = action.data || action.payload;
        const user = {
            id: data.id,
            createAt: data.create_at,
            updateAt: data.update_at,
            deleteAt: data.delete_at,
            username: data.username,
            email: data.email,
            nickname: data.nickname,
            firstName: data.first_name,
            lastName: data.last_name,
            roles: data.roles,
            notifyProps: JSON.stringify(data.notify_props),
            locale: data.locale,
            position: data.position,
            timezone: JSON.stringify(data.timezone),
            status: data.status,
        };
        realm.create('User', user, true);
        break;
    }
    default:
        break;
    }
}

export default combineWriters([
    currentUser,
]);

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineWriters} from 'realm-react-redux';

import {RoleTypes} from 'app/realm/action_types';

function role(realm, action) {
    switch (action.type) {
    case RoleTypes.RECEIVED_ROLES: {
        const data = action.data || action.payload;
        data.forEach((r) => {
            const newRole = {
                id: r.id,
                name: r.name,
                displayName: r.display_name,
                description: r.description,
                creatAt: r.create_at,
                updateAt: r.update_at,
                deleteAt: r.delete_at,
                schemeManaged: r.scheme_managed,
                builtIn: r.built_in,
                permissions: r.permissions,
            };
            realm.create('Role', newRole, true);
        });
        break;
    }
    default:
        break;
    }
}

export default combineWriters([
    role,
]);

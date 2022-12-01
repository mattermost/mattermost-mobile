// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {USER} = MM_TABLES.SERVER;

export default tableSchema({
    name: USER,
    columns: [
        {name: 'auth_service', type: 'string'},
        {name: 'delete_at', type: 'number'},
        {name: 'email', type: 'string'},
        {name: 'first_name', type: 'string'},
        {name: 'is_bot', type: 'boolean'},
        {name: 'is_guest', type: 'boolean'},
        {name: 'last_name', type: 'string'},
        {name: 'last_picture_update', type: 'number'},
        {name: 'locale', type: 'string'},
        {name: 'nickname', type: 'string'},
        {name: 'notify_props', type: 'string'},
        {name: 'position', type: 'string'},
        {name: 'props', type: 'string'},
        {name: 'remote_id', type: 'string', isOptional: true},
        {name: 'roles', type: 'string'},
        {name: 'status', type: 'string'},
        {name: 'timezone', type: 'string'},
        {name: 'update_at', type: 'number'},
        {name: 'username', type: 'string'},
        {name: 'terms_of_service_id', type: 'string'},
        {name: 'terms_of_service_create_at', type: 'number'},
    ],
});

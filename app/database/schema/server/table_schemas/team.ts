// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {TEAM} = MM_TABLES.SERVER;

export default tableSchema({
    name: TEAM,
    columns: [
        {name: 'allowed_domains', type: 'string'},
        {name: 'description', type: 'string'},
        {name: 'display_name', type: 'string'},
        {name: 'is_allow_open_invite', type: 'boolean'},
        {name: 'is_group_constrained', type: 'boolean'},
        {name: 'last_team_icon_updated_at', type: 'number'},
        {name: 'name', type: 'string'},
        {name: 'type', type: 'string'},
        {name: 'update_at', type: 'number'},
        {name: 'invite_id', type: 'string'},
    ],
});

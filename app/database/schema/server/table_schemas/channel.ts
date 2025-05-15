// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {CHANNEL} = MM_TABLES.SERVER;

export default tableSchema({
    name: CHANNEL,
    columns: [
        {name: 'create_at', type: 'number'},
        {name: 'creator_id', type: 'string', isIndexed: true},
        {name: 'delete_at', type: 'number'},
        {name: 'display_name', type: 'string'},
        {name: 'is_group_constrained', type: 'boolean'},
        {name: 'name', type: 'string', isIndexed: true},
        {name: 'shared', type: 'boolean'},
        {name: 'team_id', type: 'string', isIndexed: true},
        {name: 'type', type: 'string'},
        {name: 'update_at', type: 'number'},
        {name: 'banner_info', type: 'string', isOptional: true},
        {name: 'abac_policy_enforced', type: 'boolean', isOptional: true},
    ],
});

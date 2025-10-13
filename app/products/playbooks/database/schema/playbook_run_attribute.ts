// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

const {PLAYBOOK_RUN_ATTRIBUTE} = PLAYBOOK_TABLES;

/**
 * The schema for the PLAYBOOK_RUN_ATTRIBUTE table.
 * notice that this mimics closely the Custom Profile Attribute table schema. As there is a base element to both on properties.
 * After discussing, we decided to have a separate client schema for each feature based on System Attributes.
 * although we moved away from field/attribute to an attribute/attribute value which might have some initial confusion but
 * will eventually be more consistent.
 */

export default tableSchema({
    name: PLAYBOOK_RUN_ATTRIBUTE,
    columns: [
        {name: 'group_id', type: 'string'},
        {name: 'name', type: 'string'},
        {name: 'type', type: 'string'},
        {name: 'target_id', type: 'string'},
        {name: 'target_type', type: 'string'},
        {name: 'create_at', type: 'number'},
        {name: 'update_at', type: 'number'},
        {name: 'delete_at', type: 'number'},
        {name: 'attrs', type: 'string', isOptional: true},
    ],
});

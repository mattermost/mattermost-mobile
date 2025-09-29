// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

const {PLAYBOOK_RUN_ATTRIBUTE_VALUE} = PLAYBOOK_TABLES;

export default tableSchema({
    name: PLAYBOOK_RUN_ATTRIBUTE_VALUE,
    columns: [
        {name: 'attribute_id', type: 'string', isIndexed: true},
        {name: 'run_id', type: 'string', isIndexed: true},
        {name: 'value', type: 'string'},
    ],
});

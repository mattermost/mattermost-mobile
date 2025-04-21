// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

const {PLAYBOOK_CHECKLIST} = PLAYBOOK_TABLES;

export default tableSchema({
    name: PLAYBOOK_CHECKLIST,
    columns: [
        {name: 'run_id', type: 'string', isIndexed: true},
        {name: 'title', type: 'string'},
        {name: 'order', type: 'number'},
    ],
});

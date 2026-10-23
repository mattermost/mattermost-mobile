// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

export default tableSchema({
    name: PLAYBOOK_TABLES.PLAYBOOK_TIMELINE_EVENT,
    columns: [
        {name: 'run_id', type: 'string', isIndexed: true},
        {name: 'event_at', type: 'number', isIndexed: true},
        {name: 'event_type', type: 'string'},
        {name: 'details', type: 'string'},
        {name: 'subject_user_id', type: 'string'},
        {name: 'create_at', type: 'number'},
        {name: 'summary', type: 'string'},
        {name: 'post_id', type: 'string'},
        {name: 'creator_user_id', type: 'string'},
    ],
});

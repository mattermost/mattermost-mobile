// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {CHANNEL_INFO} = MM_TABLES.SERVER;

export default tableSchema({
    name: CHANNEL_INFO,
    columns: [
        {name: 'guest_count', type: 'number'},
        {name: 'header', type: 'string'},
        {name: 'member_count', type: 'number'},
        {name: 'pinned_post_count', type: 'number'},
        {name: 'files_count', type: 'number'},
        {name: 'purpose', type: 'string'},
    ],
});

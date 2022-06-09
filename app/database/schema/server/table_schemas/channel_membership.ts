// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {CHANNEL_MEMBERSHIP} = MM_TABLES.SERVER;

export default tableSchema({
    name: CHANNEL_MEMBERSHIP,
    columns: [
        {name: 'channel_id', type: 'string', isIndexed: true},
        {name: 'user_id', type: 'string', isIndexed: true},
        {name: 'scheme_admin', type: 'boolean'},
    ],
});

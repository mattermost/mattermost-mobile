// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {TEAM_CHANNEL_HISTORY} = MM_TABLES.SERVER;

export default tableSchema({
    name: TEAM_CHANNEL_HISTORY,
    columns: [
        {name: 'channel_ids', type: 'string'},
    ],
});

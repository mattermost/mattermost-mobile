// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {TEAM_THREADS_SYNC} = MM_TABLES.SERVER;

export default tableSchema({
    name: TEAM_THREADS_SYNC,
    columns: [
        {name: 'earliest', type: 'number'},
        {name: 'latest', type: 'number'},
    ],
});

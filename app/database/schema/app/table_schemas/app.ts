// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {INFO} = MM_TABLES.APP;

export default tableSchema({
    name: INFO,
    columns: [
        {name: 'build_number', type: 'string'},
        {name: 'created_at', type: 'number'},
        {name: 'version_number', type: 'string'},
    ],
});

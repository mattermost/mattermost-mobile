// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {POST_METADATA} = MM_TABLES.SERVER;

export default tableSchema({
    name: POST_METADATA,
    columns: [
        {name: 'data', type: 'string'},
    ],
});

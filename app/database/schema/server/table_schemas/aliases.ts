// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {ALIASES} = MM_TABLES.SERVER;

export default tableSchema({
    name: ALIASES,
    columns: [
        {name: 'from', type: 'string'},
        {name: 'to', type: 'string'},
    ],
});

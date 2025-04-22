// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {CUSTOM_PROFILE_ATTRIBUTE} = MM_TABLES.SERVER;

export default tableSchema({
    name: CUSTOM_PROFILE_ATTRIBUTE,
    columns: [
        {name: 'field_id', type: 'string', isIndexed: true},
        {name: 'user_id', type: 'string', isIndexed: true},
        {name: 'value', type: 'string'},
    ],
});

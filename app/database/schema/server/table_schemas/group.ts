// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {GROUP} = MM_TABLES.SERVER;

export default tableSchema({
    name: GROUP,
    columns: [
        {name: 'allow_reference', type: 'boolean'},
        {name: 'delete_at', type: 'number'},
        {name: 'display_name', type: 'string'},
        {name: 'name', type: 'string'},
    ],
});

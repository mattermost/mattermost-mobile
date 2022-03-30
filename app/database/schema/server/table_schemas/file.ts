// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {FILE} = MM_TABLES.SERVER;

export default tableSchema({
    name: FILE,
    columns: [
        {name: 'extension', type: 'string'},
        {name: 'height', type: 'number'},
        {name: 'image_thumbnail', type: 'string'},
        {name: 'local_path', type: 'string', isOptional: true},
        {name: 'mime_type', type: 'string'},
        {name: 'name', type: 'string'},
        {name: 'post_id', type: 'string', isIndexed: true},
        {name: 'size', type: 'number'},
        {name: 'width', type: 'number'},
    ],
});

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {MY_CHANNEL_SETTINGS} = MM_TABLES.SERVER;

export default tableSchema({
    name: MY_CHANNEL_SETTINGS,
    columns: [
        {name: 'notify_props', type: 'string'},
    ],
});

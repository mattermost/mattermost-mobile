// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {tableSchema} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {TERMS_OF_SERVICE} = MM_TABLES.SERVER;

export default tableSchema({
    name: TERMS_OF_SERVICE,
    columns: [
        {name: 'accepted_at', type: 'number'},
    ],
});

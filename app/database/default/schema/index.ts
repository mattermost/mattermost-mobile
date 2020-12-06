// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppSchema, appSchema} from '@nozbe/watermelondb';

import {app, global, servers} from './table_schemas';

export const defaultSchema: AppSchema = appSchema({
    version: 1,
    tables: [
        app,
        global,
        servers,
    ],
});

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppSchema, appSchema} from '@nozbe/watermelondb';

import {custom_emoji, role, system, terms_of_service} from './table_schemas';

export const serverSchema: AppSchema = appSchema({
    version: 1,
    tables: [
        custom_emoji,
        role,
        system,
        terms_of_service,
    ],
});

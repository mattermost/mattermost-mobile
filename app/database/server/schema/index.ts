// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppSchema, appSchema} from '@nozbe/watermelondb';

import {
    group,
    group_membership,
    groups_in_channel,
    groups_in_team,
} from './table_schemas';

export const serverSchema: AppSchema = appSchema({
    version: 1,
    tables: [
        group,
        group_membership,
        groups_in_channel,
        groups_in_team,
    ],
});

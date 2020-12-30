// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppSchema, appSchema} from '@nozbe/watermelondb';

import {
    custom_emoji,
    role,
    system,
    terms_of_service,
    my_team,
    team_channel_history,
    team_membership,
    team_search_history,
    slash_command, team,
} from './table_schemas';

export const serverSchema: AppSchema = appSchema({
    version: 1,
    tables: [
        custom_emoji,
        my_team,
        role,
        slash_command,
        system,
        team,
        team_channel_history,
        team_membership,
        team_search_history,
        terms_of_service,
    ],
});

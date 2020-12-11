// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppSchema, appSchema} from '@nozbe/watermelondb';

import {channel, channel_info, channel_membership, custom_emoji, draft, file, group, group_in_channel, group_in_team, group_membership, my_channel, my_channel_settings, my_team, post, post_metadata, posts_in_channel, posts_in_thread, preference, reaction, role, slash_command, system, team, team_channel_history, team_membership, team_search_history, terms_of_service, user} from './table_schemas';

export const serverSchema: AppSchema = appSchema({
    version: 1,
    tables: [
        channel,
        channel_info,
        channel_membership,
        custom_emoji,
        draft,
        file,
        group,
        group_membership,
        group_in_channel,
        group_in_team,
        my_channel,
        my_channel_settings,
        my_team,
        post,
        posts_in_channel,
        posts_in_thread,
        post_metadata,
        preference,
        reaction,
        role,
        slash_command,
        system,
        team,
        team_channel_history,
        team_membership,
        team_search_history,
        terms_of_service,
        user,
    ],
});

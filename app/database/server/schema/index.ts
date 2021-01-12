// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppSchema, appSchema} from '@nozbe/watermelondb';

import {
    ChannelMembershipSchema,
    CustomEmojiSchema,
    MyTeamSchema,
    PreferenceSchema,
    ReactionSchema,
    RoleSchema,
    SlashCommandSchema,
    SystemSchema,
    TeamChannelHistorySchema,
    TeamMembershipSchema,
    TeamSchema,
    TeamSearchHistorySchema,
    TermsOfServiceSchema,
    UserSchema,
} from './table_schemas';

export const serverSchema: AppSchema = appSchema({
    version: 1,
    tables: [
        ChannelMembershipSchema,
        CustomEmojiSchema,
        MyTeamSchema,
        PreferenceSchema,
        ReactionSchema,
        RoleSchema,
        SlashCommandSchema,
        SystemSchema,
        TeamChannelHistorySchema,
        TeamMembershipSchema,
        TeamSchema,
        TeamSearchHistorySchema,
        TermsOfServiceSchema,
        UserSchema,
    ],
});

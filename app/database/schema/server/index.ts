// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppSchema, appSchema} from '@nozbe/watermelondb';

import {
    ChannelInfoSchema,
    ChannelMembershipSchema,
    ChannelSchema,
    CustomEmojiSchema,
    DraftSchema,
    FileSchema,
    GroupMembershipSchema,
    GroupSchema,
    GroupsChannelSchema,
    GroupsTeamSchema,
    MyChannelSchema,
    MyChannelSettingsSchema,
    MyTeamSchema,
    PostInThreadSchema,
    PostSchema,
    PostsInChannelSchema,
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
    ThreadSchema,
    ThreadParticipantsSchema,
    UserSchema,
} from './table_schemas';

export const serverSchema: AppSchema = appSchema({
    version: 1,
    tables: [
        ChannelInfoSchema,
        ChannelMembershipSchema,
        ChannelSchema,
        CustomEmojiSchema,
        DraftSchema,
        FileSchema,
        GroupMembershipSchema,
        GroupSchema,
        GroupsChannelSchema,
        GroupsTeamSchema,
        MyChannelSchema,
        MyChannelSettingsSchema,
        MyTeamSchema,
        PostInThreadSchema,
        PostSchema,
        PostsInChannelSchema,
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
        ThreadSchema,
        ThreadParticipantsSchema,
        UserSchema,
    ],
});

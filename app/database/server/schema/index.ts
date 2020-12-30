// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppSchema, appSchema} from '@nozbe/watermelondb';

import {
    ChannelMemberShipSchema,
    CustomEmojiSchema,
    PreferenceSchema,
    ReactionSchema,
    RoleSchema,
    SystemSchema,
    TermsofServiceSchema,
    UserSchema,
} from './table_schemas';

export const serverSchema: AppSchema = appSchema({
    version: 1,
    tables: [
        ChannelMemberShipSchema,
        CustomEmojiSchema,
        PreferenceSchema,
        ReactionSchema,
        RoleSchema,
        SystemSchema,
        TermsofServiceSchema,
        UserSchema,
    ],
});

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';

export const queryAllCustomEmojis = async (database: Database): Promise<CustomEmojiModel[]> => {
    try {
        return database.get<CustomEmojiModel>(MM_TABLES.SERVER.CUSTOM_EMOJI).query().fetch();
    } catch {
        return [];
    }
};

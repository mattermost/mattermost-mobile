// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {field} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';

const {CUSTOM_EMOJI} = MM_TABLES.SERVER;

export default class CustomEmoji extends Model {
    static table = CUSTOM_EMOJI

    @field('emoji_id') emojiId!: string
    @field('name') name!: string
}

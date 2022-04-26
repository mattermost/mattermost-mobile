// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {field} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';

import type CustomEmojiModelInterface from '@typings/database/models/servers/custom_emoji';

const {CUSTOM_EMOJI} = MM_TABLES.SERVER;

/**  The CustomEmoji model describes all the custom emojis used in the Mattermost app */
export default class CustomEmojiModel extends Model implements CustomEmojiModelInterface {
    /** table (name) : CustomEmoji */
    static table = CUSTOM_EMOJI;

    /** name :  The custom emoji's name*/
    @field('name') name!: string;
}

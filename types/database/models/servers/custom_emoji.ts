// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type Model from '@nozbe/watermelondb/Model';

/**  The CustomEmoji model describes all the custom emojis used in the Mattermost app */
declare class CustomEmojiModel extends Model {
    /** table (name) : CustomEmoji */
    static table: string;

    /** name :  The custom emoji's name*/
    name: string;
}

export default CustomEmojiModel;

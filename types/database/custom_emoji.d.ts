// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

/**  The CustomEmoji model describes all the custom emojis used in the Mattermost app */
export default class CustomEmoji extends Model {
    /** table (entity name) : CustomEmoji */
    static table: string;

    /** name :  The custom emoji's name*/
    name: string;
}

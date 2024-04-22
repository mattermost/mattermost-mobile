// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * The Post model is the building block of communication in the Mattermost app.
 */
declare class UserChannelModel extends Model {
    /** table (name) : UserChannel */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** channel_id : The foreign key for the Channel to which this post belongs to. */
    channelId: string;

    /** user_id : The foreign key of the User who authored this post. */
    userId: string;

    /** latest_read : The timestamp of the last post seen by the user */
    latestRead: number;
}

export default UserChannelModel;

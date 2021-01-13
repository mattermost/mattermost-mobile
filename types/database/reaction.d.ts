// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import User from '@typings/database/user';
import Post from '@typings/database/post';

/**
 * The Reaction Model is used to present the reactions a user had on a particular post
 */
export default class Reaction extends Model {
    /** table (entity name) : Reaction */
    static table: string;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations;

    /** createAt : Creation timestamp used for sorting reactions amongst users on a particular post */
    createAt: number;

    /** emoji_name : The emoticon used to express the reaction */
    emojiName: string;

    /** post_id : The related Post's foreign key on which this reaction was expressed */
    postId: string;

    /** user_id : The related User's foreign key by which this reaction was expressed */
    userId: string;

    /** user : The related record to the User model */
    user: Relation<User>;

    /** post : The related record to the Post model */
    post: Relation<Post>;
}

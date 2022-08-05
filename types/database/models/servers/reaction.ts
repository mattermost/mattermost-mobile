// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type PostModel from './post';
import type UserModel from './user';
import type {Relation, Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * The Reaction Model is used to present the reactions a user had on a particular post
 */
declare class ReactionModel extends Model {
    /** table (name) : Reaction */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** create_at : Creation timestamp used for sorting reactions amongst users on a particular post */
    createAt: number;

    /** emoji_name : The emoticon used to express the reaction */
    emojiName: string;

    /** post_id : The related Post's foreign key on which this reaction was expressed */
    postId: string;

    /** user_id : The related User's foreign key by which this reaction was expressed */
    userId: string;

    /** user : The related record to the User model */
    user: Relation<UserModel>;

    /** post : The related record to the Post model */
    post: Relation<PostModel>;
}

export default ReactionModel;

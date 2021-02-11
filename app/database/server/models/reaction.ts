// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import Post from '@typings/database/post';
import User from '@typings/database/user';

const {POST, REACTION, USER} = MM_TABLES.SERVER;

/**
 * The Reaction Model is used to present the reactions a user had on a particular post
 */
export default class Reaction extends Model {
    /** table (entity name) : Reaction */
    static table = REACTION;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {

        /** A POST can have multiple REACTION. (relationship is 1:N) */
        [POST]: {type: 'belongs_to', key: 'post_id'},

        /** A USER can have multiple REACTION. (relationship is 1:N) */
        [USER]: {type: 'belongs_to', key: 'user_id'},
    };

    /** create_at : Creation timestamp used for sorting reactions amongst users on a particular post */
    @field('create_at') createAt!: number;

    /** emoji_name : The emoticon used to express the reaction */
    @field('emoji_name') emojiName!: string;

    /** post_id : The related Post's foreign key on which this reaction was expressed */
    @field('post_id') postId!: string;

    /** user_id : The related User's foreign key by which this reaction was expressed */
    @field('user_id') userId!: string;

    /** user : The related record to the User model */
    @immutableRelation(USER, 'user_id') user!: Relation<User>;

    /** post : The related record to the Post model */
    @immutableRelation(POST, 'post_id') post!: Relation<Post>;
}

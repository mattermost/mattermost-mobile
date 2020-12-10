// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';
import {field, relation} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import User from '@typings/database/user';
import Post from '@typings/database/post';

const {POST, REACTION, USER} = MM_TABLES.SERVER;

/**
 * The Reaction Model is used to present the reactions a user had on a particular post
 */
export default class Reaction extends Model {
    /** table (entity name) : Reaction */
    static table = REACTION

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {

        /** A REACTION belongs to a POST  */
        [POST]: {type: 'belongs_to', key: 'post_id'},

        /** A REACTION is created by a USER */
        [USER]: {type: 'belongs_to', key: 'user_id'},
    }

    /** createAt : Creation timestamp used for sorting reactions amongst users on a particular post */
    @field('create_at') createAt!: number

    /** emoji_name : The emoticon used to express the reaction */
    @field('emoji_name') emojiName!: string

    /** post_id : The related Post's foreign key on which this reaction was expressed */
    @field('post_id') postId!: string

    /** user_id : The related User's foreign key by which this reaction was expressed */
    @field('user_id') userId!: string

    /** reactionUser : The related record to the User model */
    @relation(USER, 'user_id') reactionUser!: User

    /** reactionPost : The related record to the Post model */
    @relation(POST, 'post_id') reactionPost!: Post
}

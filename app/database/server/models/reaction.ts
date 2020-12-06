// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';
import {field, relation} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import User from '@typings/database/user';
import Post from '@typings/database/post';

const {POST, REACTION, USER} = MM_TABLES.SERVER;

export default class Reaction extends Model {
    static table = REACTION
    static associations: Associations = {
        [POST]: {type: 'belongs_to', key: 'post_id'},
        [USER]: {type: 'belongs_to', key: 'user_id'},
    }

    @field('create_at') createAt!: number
    @field('emoji_name') emojiName!: string
    @field('post_id') postId!: string
    @field('reaction_id') reactionId!: string
    @field('user_id') userId!: string

    @relation(USER, 'user_id') reactionUser!: User
    @relation(POST, 'post_id') reactionPost!: Post
}

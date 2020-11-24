// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {MM_TABLES} from '@constants/database';
import field from '@nozbe/watermelondb/decorators/field';
import relation from '@nozbe/watermelondb/decorators/relation';
import User from '@typings/database/user';
import Post from '@typings/database/post';

export default class Reaction extends Model {
    static table = MM_TABLES.SERVER.REACTION
    static associations: Associations = {
        [MM_TABLES.SERVER.POST]: {type: 'belongs_to', key: 'post_id'},
        [MM_TABLES.SERVER.USER]: {type: 'belongs_to', key: 'user_id'},
    }

    @field('create_at') createAt!: number
    @field('emoji_name') emojiName!: string
    @field('post_id') postId!: string
    @field('reaction_id') reactionId!: string
    @field('user_id') userId!: string

    @relation(MM_TABLES.SERVER.USER, 'user_id') reactionUser!: User
    @relation(MM_TABLES.SERVER.POST, 'post_id') reactionPost!: Post
}

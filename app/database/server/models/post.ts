// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {MM_TABLES} from '@constants/database';
import field from '@nozbe/watermelondb/decorators/field';
import json from '@nozbe/watermelondb/decorators/json';

export default class Post extends Model {
    static table = MM_TABLES.SERVER.POST
    static associations: Associations = {
        [MM_TABLES.SERVER.USER]: {type: 'belongs_to', key: 'user_id'},
    }

    @field('channel_id') channelId!: string
    @field('create_at') createAt!: number
    @field('delete_at') deleteAt!: number
    @field('edit_at') edit_at!: number
    @field('is_pinned') isPinned!: boolean
    @field('message') message!: string
    @field('original_id') originalId!: string
    @field('pending_post_id') pendingPostId!: string
    @field('post_id') postId!: string
    @field('previous_post_id') previousPostId!: string
    @json('props', (rawJson) => rawJson) props!: string
    @field('root_id') rootId!: string
    @field('type') type!: string
    @field('user_id') userId!: string
}

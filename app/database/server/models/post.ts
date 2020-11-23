// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {MM_TABLES} from '@constants/database';
import field from '@nozbe/watermelondb/decorators/field';
import json from '@nozbe/watermelondb/decorators/json';
import children from '@nozbe/watermelondb/decorators/children';
import Reaction from '@typings/database/reaction';
import PostInThread from '@typings/database/post_in_thread';
import PostMetadata from '@typings/database/post_metadata';
import Draft from '@typings/database/draft';
import File from '@typings/database/file';

export default class Post extends Model {
    static table = MM_TABLES.SERVER.POST
    static associations: Associations = {
        [MM_TABLES.SERVER.CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
        [MM_TABLES.SERVER.DRAFT]: {type: 'has_many', foreignKey: 'root_id'},
        [MM_TABLES.SERVER.FILE]: {type: 'has_many', foreignKey: 'post_id'},
        [MM_TABLES.SERVER.POSTS_IN_THREAD]: {type: 'has_many', foreignKey: 'post_id'},
        [MM_TABLES.SERVER.POST_METADATA]: {type: 'has_many', foreignKey: 'post_id'},
        [MM_TABLES.SERVER.REACTION]: {type: 'has_many', foreignKey: 'post_id'},
        [MM_TABLES.SERVER.USER]: {type: 'belongs_to', key: 'user_id'},
    }

    @field('channel_id') channelId!: string
    @field('create_at') createAt!: number
    @field('delete_at') deleteAt!: number
    @field('edit_at') editAt!: number
    @field('is_pinned') isPinned!: boolean
    @field('message') message!: string
    @field('original_id') originalId!: string
    @field('pending_post_id') pendingPostId!: string
    @field('previous_post_id') previousPostId!: string
    @field('root_id') rootId!: string
    @field('type') type!: string
    @field('user_id') userId!: string
    @json('props', (rawJson) => rawJson) props!: string[]

    @children(MM_TABLES.SERVER.DRAFT) draft!: Draft
    @children(MM_TABLES.SERVER.FILE) file!: File
    @children(MM_TABLES.SERVER.POSTS_IN_THREAD) postInThread!: PostInThread
    @children(MM_TABLES.SERVER.POST_METADATA) postMetadata!: PostMetadata
    @children(MM_TABLES.SERVER.REACTION) reaction!: Reaction
}

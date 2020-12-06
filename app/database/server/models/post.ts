// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';
import {children, field, immutableRelation, json} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import Channel from '@typings/database/channel';
import Draft from '@typings/database/draft';
import File from '@typings/database/file';
import PostInThread from '@typings/database/post_in_thread';
import PostMetadata from '@typings/database/post_metadata';
import Reaction from '@typings/database/reaction';
import User from '@typings/database/user';

const {CHANNEL, DRAFT, FILE, POST, POSTS_IN_THREAD, POST_METADATA, REACTION, USER} = MM_TABLES.SERVER;

export default class Post extends Model {
    static table = POST
    static associations: Associations = {
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
        [DRAFT]: {type: 'has_many', foreignKey: 'root_id'},
        [FILE]: {type: 'has_many', foreignKey: 'post_id'},
        [POSTS_IN_THREAD]: {type: 'has_many', foreignKey: 'post_id'},
        [POST_METADATA]: {type: 'has_many', foreignKey: 'post_id'},
        [REACTION]: {type: 'has_many', foreignKey: 'post_id'},
        [USER]: {type: 'belongs_to', key: 'user_id'},
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

    @children(DRAFT) draft!: Draft
    @children(FILE) file!: File
    @children(POSTS_IN_THREAD) postInThread!: PostInThread
    @children(POST_METADATA) postMetadata!: PostMetadata
    @children(REACTION) reaction!: Reaction

    @immutableRelation(USER, 'user_id') postUser!: User
    @immutableRelation(CHANNEL, 'channel_id') postChannel!: Channel
}

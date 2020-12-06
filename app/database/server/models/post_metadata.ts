// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';
import {field, json} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';

const {POST, POST_METADATA} = MM_TABLES.SERVER;

export default class PostMetadata extends Model {
    static table = POST_METADATA
    static associations: Associations = {
        [POST]: {type: 'belongs_to', key: 'post_id'},
    }

    @field('post_id') postId!: string
    @field('type') type!: string
    @json('data', (rawJson) => rawJson) data!: string[]
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {MM_TABLES} from '@constants/database';
import field from '@nozbe/watermelondb/decorators/field';
import json from '@nozbe/watermelondb/decorators/json';

export default class PostMetadata extends Model {
    static table = MM_TABLES.SERVER.POST_METADATA
    static associations: Associations = {
        [MM_TABLES.SERVER.POST]: {type: 'belongs_to', key: 'post_id'},
    }

    @field('post_id') postId!: string
    @field('type') type!: string
    @json('data', (rawJson) => rawJson) data!: string[]
}

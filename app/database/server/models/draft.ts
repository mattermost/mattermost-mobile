// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {MM_TABLES} from '@constants/database';
import field from '@nozbe/watermelondb/decorators/field';
import json from '@nozbe/watermelondb/decorators/json';

export default class Draft extends Model {
    static table = MM_TABLES.SERVER.DRAFT
    static associations: Associations = {
        [MM_TABLES.SERVER.CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
        [MM_TABLES.SERVER.FILE]: {type: 'has_many', foreignKey: 'draft_id'},
        [MM_TABLES.SERVER.POST]: {type: 'belongs_to', key: 'root_id'},
    }

    @field('channel_id') channelId!: string
    @field('message') message!: string
    @field('root_id') rootId!: string
    @json('files', (rawJson) => rawJson) files!: string[]
}

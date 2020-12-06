// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import field from '@nozbe/watermelondb/decorators/field';
import json from '@nozbe/watermelondb/decorators/json';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

const {CHANNEL, POST} = MM_TABLES.SERVER;

export default class Draft extends Model {
    static table = MM_TABLES.SERVER.DRAFT
    static associations: Associations = {
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
        [POST]: {type: 'belongs_to', key: 'root_id'},
    }

    @field('channel_id') channelId!: string
    @field('message') message!: string
    @field('root_id') rootId!: string
    @json('files', (rawJson) => rawJson) files!: string[]
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {MM_TABLES} from '@constants/database';
import field from '@nozbe/watermelondb/decorators/field';
import json from '@nozbe/watermelondb/decorators/json';

export default class MyChannelSettings extends Model {
    static table = MM_TABLES.SERVER.MY_CHANNEL_SETTINGS
    static associations: Associations = {
        [MM_TABLES.SERVER.CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
    }

    @field('channel_id') channelId! : string
    @json('notify_props', (rawJson) => rawJson) notifyProps! : string[]
}

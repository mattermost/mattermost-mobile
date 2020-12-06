// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import field from '@nozbe/watermelondb/decorators/field';
import json from '@nozbe/watermelondb/decorators/json';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

const {CHANNEL, MY_CHANNEL_SETTINGS} = MM_TABLES.SERVER;

export default class MyChannelSettings extends Model {
    static table = MY_CHANNEL_SETTINGS
    static associations: Associations = {
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
    }

    @field('channel_id') channelId! : string
    @json('notify_props', (rawJson) => rawJson) notifyProps! : string[]
}

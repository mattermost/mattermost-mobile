// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';
import {field} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';

const {CHANNEL, MY_CHANNEL} = MM_TABLES.SERVER;

export default class MyChannel extends Model {
    static table = MY_CHANNEL
    static associations: Associations = {
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
    }

    @field('channel_id') channelId!: string
    @field('last_post_at') lastPostAt!: number
    @field('last_viewed_at') lastViewedAt!: number
    @field('mentions_count') mentionsCount!: number
    @field('message_count') messageCount!: number
    @field('roles') roles!: string
}

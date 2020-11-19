// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {MM_TABLES} from '@constants/database';
import field from '@nozbe/watermelondb/decorators/field';

export default class MyChannel extends Model {
    static table = MM_TABLES.SERVER.MY_CHANNEL
    static associations: Associations = {
        [MM_TABLES.SERVER.CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
    }

    @field('channel_id') channelId!: string
    @field('last_post_at') lastPostAt!: number
    @field('last_viewed_at') lastViewedAt!: number
    @field('mentions_count') mentionsCount!: number
    @field('msg_count') msgCount!: number
    @field('roles') roles!: string
}

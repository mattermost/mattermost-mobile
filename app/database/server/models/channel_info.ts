// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import field from '@nozbe/watermelondb/decorators/field';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

const {CHANNEL, CHANNEL_INFO} = MM_TABLES.SERVER;

export default class ChannelInfo extends Model {
    static table = CHANNEL_INFO
    static associations: Associations = {
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
    }

    @field('channel_id') channelId!: string
    @field('guest_count') guestCount!: number
    @field('header') header!: string
    @field('member_count') memberCount!: number
    @field('pin_post_count') pinPostCount!: number
    @field('purpose') purpose!: string
}

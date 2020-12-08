// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {field, lazy} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';

const {CHANNEL, CHANNEL_INFO} = MM_TABLES.SERVER;

/**
 * ChannelInfo is an extension of the information contained in the Channel entity.
 * In a Separation of Concerns approach, ChannelInfo will provide additional information about a channel but on a more
 * specific level.
 */
export default class ChannelInfo extends Model {
    // table (entity name) : ChannelInfo
    static table = CHANNEL_INFO

    // associations : Describes every relationship to this entity.
    static associations: Associations = {

        // Entities Channel and Channel_Info have a 1:1 relationship
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
    }

    // channel_id : The foreign key from entity Channel
    @field('channel_id') channelId!: string

    // guest_count : The number of guest in this channel
    @field('guest_count') guestCount!: number

    // header : The headers at the top of each channel
    @field('header') header!: string

    // member_count: The number of members in this channel
    @field('member_count') memberCount!: number

    // pin_post_count : The number of post pinned in this channel
    @field('pin_post_count') pinPostCount!: number

    // purpose: The intention behind this channel
    @field('purpose') purpose!: string

    // channel : The lazy query property to the record from  entity CHANNEL
    @lazy channel = this.collections.get(CHANNEL).query(Q.on(CHANNEL_INFO, 'channel_id', this.channelId))
}

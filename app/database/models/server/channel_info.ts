// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import Channel from '@typings/database/channel';

const {CHANNEL, CHANNEL_INFO} = MM_TABLES.SERVER;

/**
 * ChannelInfo is an extension of the information contained in the Channel entity.
 * In a Separation of Concerns approach, ChannelInfo will provide additional information about a channel but on a more
 * specific level.
 */
export default class ChannelInfo extends Model {
    /** table (entity name) : ChannelInfo */
    static table = CHANNEL_INFO;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {

        /** A CHANNEL is associated with only one CHANNEL_INFO (relationship is 1:1) */
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
    };

    /** channel_id : The foreign key from CHANNEL */
    @field('channel_id') channelId!: string;

    /** guest_count : The number of guest in this channel */
    @field('guest_count') guestCount!: number;

    /** header : The headers at the top of each channel */
    @field('header') header!: string;

    /** member_count: The number of members in this channel */
    @field('member_count') memberCount!: number;

    /** pinned_post_count : The number of post pinned in this channel */
    @field('pinned_post_count') pinnedPostCount!: number;

    /** purpose: The intention behind this channel */
    @field('purpose') purpose!: string;

    /** channel : The lazy query property to the record from  entity CHANNEL */
    @immutableRelation(CHANNEL, 'channel_id') channel!: Relation<Channel>;
}

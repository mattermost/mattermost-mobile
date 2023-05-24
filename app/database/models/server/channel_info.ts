// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type {Relation} from '@nozbe/watermelondb';
import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoInterface from '@typings/database/models/servers/channel_info';

const {CHANNEL, CHANNEL_INFO} = MM_TABLES.SERVER;

/**
 * ChannelInfo is an extension of the information contained in the Channel table.
 * In a Separation of Concerns approach, ChannelInfo will provide additional information about a channel but on a more
 * specific level.
 */
export default class ChannelInfoModel extends Model implements ChannelInfoInterface {
    /** table (name) : ChannelInfo */
    static table = CHANNEL_INFO;

    static associations: Associations = {
        [CHANNEL]: {type: 'belongs_to', key: 'id'},
    };

    /** guest_count : The number of guest in this channel */
    @field('guest_count') guestCount!: number;

    /** header : The headers at the top of each channel */
    @field('header') header!: string;

    /** member_count: The number of members in this channel */
    @field('member_count') memberCount!: number;

    /** pinned_post_count : The number of post pinned in this channel */
    @field('pinned_post_count') pinnedPostCount!: number;

    /** files_count : The number of files in this channel */
    @field('files_count') filesCount!: number;

    /** purpose: The intention behind this channel */
    @field('purpose') purpose!: string;

    /** channel : The lazy query property to the record from CHANNEL table */
    @immutableRelation(CHANNEL, 'id') channel!: Relation<ChannelModel>;
}

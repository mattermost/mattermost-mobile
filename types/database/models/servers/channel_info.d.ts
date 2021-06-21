// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import Channel from './channel';

/**
 * ChannelInfo is an extension of the information contained in the Channel table.
 * In a Separation of Concerns approach, ChannelInfo will provide additional information about a channel but on a more
 * specific level.
 */
export default class ChannelInfo extends Model {
    /** table (name) : ChannelInfo */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** channel_id : The foreign key from CHANNEL */
    channelId: string;

    /** guest_count : The number of guest in this channel */
    guestCount: number;

    /** header : The headers at the top of each channel */
    header: string;

    /** member_count: The number of members in this channel */
    memberCount: number;

    /** pinned_post_count : The number of post pinned in this channel */
    pinnedPostCount: number;

    /** purpose: The intention behind this channel */
    purpose: string;

    /** channel : The lazy query property to the record from the CHANNEL table */
    channel: Relation<Channel>;
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ChannelModel from './channel';
import type {Relation} from '@nozbe/watermelondb';
import type Model from '@nozbe/watermelondb/Model';

/**
 * ChannelInfo is an extension of the information contained in the Channel table.
 * In a Separation of Concerns approach, ChannelInfo will provide additional information about a channel but on a more
 * specific level.
 */
declare class ChannelInfoModel extends Model {
    /** table (name) : ChannelInfo */
    static table: string;

    /** guest_count : The number of guest in this channel */
    guestCount: number;

    /** header : The headers at the top of each channel */
    header: string;

    /** member_count: The number of members in this channel */
    memberCount: number;

    /** pinned_post_count : The number of post pinned in this channel */
    pinnedPostCount: number;

    /** files_count : The number of files in this channel */
    filesCount: number;

    /** purpose: The intention behind this channel */
    purpose: string;

    /** channel : The lazy query property to the record from the CHANNEL table */
    channel: Relation<ChannelModel>;
}

export default ChannelInfoModel;

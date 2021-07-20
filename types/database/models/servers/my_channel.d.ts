// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

/**
 * MyChannel is an extension of the Channel model but it lists only the Channels the app's user belongs to
 */
export default class MyChannelModel extends Model {
    /** table (name) : MyChannel */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** last_post_at : The timestamp for any last post on this channel */
    lastPostAt: number;

    /** last_viewed_at : The timestamp showing the user's last viewed post on this channel */
    lastViewedAt: number;

    /** mentions_count : The number of mentions on this channel */
    mentionsCount: number;

    /** message_count : The derived number of unread messages on this channel */
    messageCount: number;

    /** roles : The user's privileges on this channel */
    roles: string;

    /** channel : The relation pointing to the CHANNEL table */
    channel: Relation<ChannelModel>;
}

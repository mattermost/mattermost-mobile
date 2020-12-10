// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';

/**
 * MyChannel is an extension of the Channel model but it lists only the Channels the app's user belongs to
 */
export default class MyChannel extends Model {
    /** table (entity name) : MyChannel */
    static table: string;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations;

    /** channel_id : The foreign key to the related Channel record  */
    channelId: string;

    /** last_post_at : the timestamp for any last post on this channel */
    lastPostAt: number;

    /** last_viewed_at : timestamp showing the user's last viewed post on this channel */
    lastViewedAt: number;

    /** mentionsCount : The number of mentions on this channel */
    mentionsCount: number;

    /** messageCount : The derived number of unread messages on this channel */
    messageCount: number;

    /** roles : The user's privileges on this channel */
    roles: string;

    /** channel : The lazy query property to the record from entity CHANNEL */
    channel: import('@nozbe/watermelondb').Query<Model>;
}

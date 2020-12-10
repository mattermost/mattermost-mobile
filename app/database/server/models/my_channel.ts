// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {field, lazy} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';

const {CHANNEL, MY_CHANNEL} = MM_TABLES.SERVER;

/**
 * MyChannel is an extension of the Channel model but it lists only the Channels the app's user belongs to
 */
export default class MyChannel extends Model {
    /** table (entity name) : MyChannel */
    static table = MY_CHANNEL

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
    }

    /** channel_id : The foreign key to the related Channel record  */
    @field('channel_id') channelId!: string

    /** last_post_at : the timestamp for any last post on this channel */
    @field('last_post_at') lastPostAt!: number

    /** last_viewed_at : timestamp showing the user's last viewed post on this channel */
    @field('last_viewed_at') lastViewedAt!: number

    /** mentionsCount : The number of mentions on this channel */
    @field('mentions_count') mentionsCount!: number

    /** messageCount : The derived number of unread messages on this channel */
    @field('message_count') messageCount!: number

    /** roles : The user's privileges on this channel */
    @field('roles') roles!: string

    /** channel : The lazy query property to the record from entity CHANNEL */
    @lazy channel = this.collections.get(CHANNEL).query(Q.on(MY_CHANNEL, 'channel_id', this.channelId))
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

const {CHANNEL, CHANNEL_POSTS_RESPONSE} = MM_TABLES.SERVER;

/**
 * The ChannelPostsResponse model holds JSON string responses from network
 * requests originating on the native side.
 */
export default class ChannelPostsResponseModel extends Model {
    /** table (name) : ChannelPostsResponse */
    static table = CHANNEL_POSTS_RESPONSE;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A CHANNEL can have multiple CHANNEL_POSTS_RESPONSE. (relationship is 1:N) */
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
    };

    /** channel_id : The foreign key for the Channel to which this post belongs to. */
    @field('channel_id') channelId!: string;

    /** response : The response, as a JSON string, from the network request */
    @field('response') response!: string;
}

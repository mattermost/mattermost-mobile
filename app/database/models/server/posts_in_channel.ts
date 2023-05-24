// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type {Relation} from '@nozbe/watermelondb';
import type ChannelModel from '@typings/database/models/servers/channel';
import type PostsInChannelModelInterface from '@typings/database/models/servers/posts_in_channel';

const {CHANNEL, POSTS_IN_CHANNEL} = MM_TABLES.SERVER;

/**
 * PostsInChannel model helps us to combine adjacent posts together without leaving
 * gaps in between for an efficient user reading experience of posts.
 */
export default class PostsInChannelModel extends Model implements PostsInChannelModelInterface {
    /** table (name) : PostsInChannel */
    static table = POSTS_IN_CHANNEL;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A CHANNEL can have multiple POSTS_IN_CHANNEL. (relationship is 1:N)*/
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
    };

    /** channel_id: Associated channel identifier */
    @field('channel_id') channelId!: string;

    /** earliest : The earliest timestamp of the post in that channel  */
    @field('earliest') earliest!: number;

    /** latest : The latest timestamp of the post in that channel  */
    @field('latest') latest!: number;

    /** channel : The parent record of the channel for those posts */
    @immutableRelation(CHANNEL, 'channel_id') channel!: Relation<ChannelModel>;
}

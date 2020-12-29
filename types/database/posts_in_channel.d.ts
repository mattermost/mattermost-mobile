// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import Channel from '@typings/database/channel';

/**
 * PostsInChannel model helps us to combine adjacent posts together without leaving
 * gaps in between for an efficient user reading experience of posts.
 */
export default class PostsInChannel extends Model {
    /** table (entity name) : PostsInChannel */
    static table: string;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations;

    /** channel_id : The foreign key of the related parent channel */
    channelId: string;

    /** earliest : The earliest timestamp of the post in that channel  */
    earliest: number;

    /** latest : The latest timestamp of the post in that channel  */
    latest: number;

    /** channel : The parent record of the channel for those posts */
    channel: Relation<Channel>;
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, Query, Relation} from '@nozbe/watermelondb';
import {children, field, immutableRelation, json, lazy} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type ChannelModel from '@typings/database/models/servers/channel';
import type UserChannelInterface from '@typings/database/models/servers/user_channel';
import type UserModel from '@typings/database/models/servers/user';

const {CHANNEL, USER_CHANNEL, USER} = MM_TABLES.SERVER;

/**
 * The Post model is the building block of communication in the Mattermost app.
 */
export default class UserChannelModel extends Model implements UserChannelInterface {
    /** table (name) : Post */
    static table = USER_CHANNEL;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A USERCHANNEL can have multiple POST. (relationship is 1:N) */
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},

        /** A USER can have multiple POST.  A user can author several posts. (relationship is 1:N)*/
        [USER]: {type: 'belongs_to', key: 'user_id'},
    };

    /** channel_id : The foreign key for the Channel to which this post belongs to. */
    @field('channel_id') channelId!: string;

    /** latest_read : The timestamp to where the user last read to */
    @field('latest_read') latestRead!: number;

    /** user_id : The foreign key of the User who authored this post. */
    @field('user_id') userId!: string;

    /** author: The user */
    @immutableRelation(USER, 'user_id') author!: Relation<UserModel>;

    /** channel: The channel */
    @immutableRelation(CHANNEL, 'channel_id') channel!: Relation<ChannelModel>;

    toApi = async (): Promise<UserChannelModel> => ({
        latest_read: this.latestRead,
        user_id: this.userId,
        channel_id: this.channelId,
    });
}

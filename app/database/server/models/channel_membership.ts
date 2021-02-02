// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, Query, Relation} from '@nozbe/watermelondb';
import {field, immutableRelation, lazy} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import Channel from '@typings/database/channel';
import {MM_TABLES} from '@constants/database';
import User from '@typings/database/user';

const {CHANNEL, CHANNEL_MEMBERSHIP, USER} = MM_TABLES.SERVER;

/**
 * The ChannelMembership model represents the 'association table' where many channels have users and many users are on
 * channels ( N:N relationship between model Users and model Channel)
 */
export default class ChannelMembership extends Model {
    /** table (entity name) : ChannelMembership */
    static table = CHANNEL_MEMBERSHIP;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {

        /** A CHANNEL can have multiple USER */
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},

        /** A USER can belong to multiple CHANNEL */
        [USER]: {type: 'belongs_to', key: 'user_id'},
    };

    /** channel_id : The foreign key to the related Channel record */
    @field('channel_id') channelId!: string;

    /* user_id: The foreign key to the related User record*/
    @field('user_id') userId!: string;

    /** memberChannel : The related channel this member belongs to */
    @immutableRelation(CHANNEL, 'channel_id') memberChannel!: Relation<Channel>;

    /** memberUser : The related member belonging to the channel */
    @immutableRelation(USER, 'user_id') memberUser!: Relation<User>;

    /**
     * getAllChannelsForUser - Retrieves all the channels that the user is part of
     */
    @lazy getAllChannelsForUser = this.collections.get(CHANNEL).query(Q.on(USER, 'id', this.userId)) as Query<Channel>

    /**
     * getAllUsersInChannel - Retrieves all the users who are part of this channel
     */
    @lazy getAllUsersInChannel = this.collections.get(USER).query(Q.on(CHANNEL, 'id', this.channelId)) as Query<User>
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Query, Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import Channel from '@typings/database/channel';
import User from '@typings/database/user';

/**
 * The ChannelMembership model represents the 'association table' where many channels have users and many users are on
 * channels ( N:N relationship between model Users and model Channel)
 */
export default class ChannelMembership extends Model {
    /** table (entity name) : ChannelMembership */
    static table: string;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations;

    /** channel_id : The foreign key to the related Channel record */
    channelId: string;

    /* user_id: The foreign key to the related User record*/
    userId: string;

    /** memberChannel : The related channel this member belongs to */
    channel: Relation<Channel>;

    /** memberUser : The related member belonging to the channel */
    user: Relation<User>;

    /**
     * getAllChannelsForUser - Retrieves all the channels that the user is part of
     */
    getAllChannelsForUser: Query<Channel>;

    /**
     * getAllUsersInChannel - Retrieves all the users who are part of this channel
     */
    getAllUsersInChannel: Query<User>;
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';
import {relation} from '@nozbe/watermelondb/decorators';

import Channel from '@typings/database/channel';
import User from '@typings/database/user';

import {MM_TABLES} from '@constants/database';

const {CHANNEL, CHANNEL_MEMBERSHIP, USER} = MM_TABLES.SERVER;

/**
 * The ChannelMembership model represents the 'association table' where many channels have users and many users are on
 * channels ( N:N relationship between model Users and model Channel)
 */
export default class ChannelMembership extends Model {
    /** table (entity name) : ChannelMembership */
    static table = CHANNEL_MEMBERSHIP

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {

        /** A CHANNEL can have multiple users */
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},

        /** A USER can belong to multiple channels */
        [USER]: {type: 'belongs_to', key: 'user_id'},
    }

    /** memberChannel : The related channel this member belongs to */
    @relation(CHANNEL, 'channel_id') memberChannel!: Channel

    /** memberUser : The related member belong to the channel */
    @relation(USER, 'user_id') memberUser!: User
}

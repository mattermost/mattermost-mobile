// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

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
    static table = CHANNEL_MEMBERSHIP;

    constructor() {
        super();
        this.channel = {} as Channel;
        this.user = {} as User;
    }

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {

        /** A CHANNEL can have multiple USER */
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},

        /** A USER can belong to multiple CHANNEL */
        [USER]: {type: 'belongs_to', key: 'user_id'},
    };

    /** memberChannel : The related channel this member belongs to */
    @immutableRelation(CHANNEL, 'channel_id') channel!: Channel;

    /** memberUser : The related member belonging to the channel */
    @immutableRelation(USER, 'user_id') user!: User;
}

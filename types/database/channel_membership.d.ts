// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
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

    /** memberChannel : The related channel this member belongs to */
    channel: Relation<Channel>;

    /** memberUser : The related member belonging to the channel */
    user: Relation<User>;
}

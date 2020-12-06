// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import field from '@nozbe/watermelondb/decorators/field';
import relation from '@nozbe/watermelondb/decorators/relation';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import Channel from '@typings/database/channel';
import User from '@typings/database/user';

import {MM_TABLES} from '@constants/database';

const {CHANNEL, CHANNEL_MEMBERSHIP, USER} = MM_TABLES.SERVER;

export default class ChannelMembership extends Model {
    static table = CHANNEL_MEMBERSHIP
    static associations: Associations = {
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
        [USER]: {type: 'belongs_to', key: 'user_id'},
    }

    @field('channel_id') channelId!: string
    @field('user_id') userId!: string

    @relation(CHANNEL, 'channel_id') memberChannel!: Channel
    @relation(USER, 'user_id') memberUser!: User
}

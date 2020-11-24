// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {MM_TABLES} from '@constants/database';
import field from '@nozbe/watermelondb/decorators/field';
import relation from '@nozbe/watermelondb/decorators/relation';
import User from '@typings/database/user';
import Channel from '@typings/database/channel';

export default class ChannelMembership extends Model {
    static table = MM_TABLES.SERVER.CHANNEL_MEMBERSHIP
    static associations: Associations = {
        [MM_TABLES.SERVER.CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
        [MM_TABLES.SERVER.USER]: {type: 'belongs_to', key: 'user_id'},
    }

    @field('channel_id') channelId!: string
    @field('user_id') userId!: string

    @relation(MM_TABLES.SERVER.CHANNEL, 'channel_id') memberChannel!: Channel
    @relation(MM_TABLES.SERVER.USER, 'user_id') memberUser!: User
}

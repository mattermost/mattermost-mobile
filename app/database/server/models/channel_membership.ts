// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {MM_TABLES} from '@constants/database';
import field from '@nozbe/watermelondb/decorators/field';

export default class ChannelMembership extends Model {
    static table = MM_TABLES.SERVER.CHANNEL_MEMBERSHIP
    static associations: Associations = {
        [MM_TABLES.SERVER.USER]: {type: 'belongs_to', key: 'user_id'},
    }
    @field('channel_id') channelId!: string
    @field('user_id') userId!: string
}

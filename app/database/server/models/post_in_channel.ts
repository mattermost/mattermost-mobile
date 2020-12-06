// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';
import {field} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';

const {CHANNEL, POSTS_IN_CHANNEL} = MM_TABLES.SERVER;

export default class PostInChannel extends Model {
    static table = POSTS_IN_CHANNEL
    static associations: Associations = {
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
    }

    @field('channel_id') channelId!: string
    @field('earliest') earliest!: number
    @field('latest') latest!: number
}

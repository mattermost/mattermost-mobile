// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';
import {field, json, relation} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import User from '@typings/database/user';

const {CHANNEL, MY_CHANNEL_SETTINGS} = MM_TABLES.SERVER;

/**
 * The MyChannelSettings model represents the specific user's configuration to
 * the channel that user belongs to.
 */
export default class MyChannelSettings extends Model {
    /** table (entity name) : MyChannelSettings */
    static table = MY_CHANNEL_SETTINGS

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {

        /** A CHANNEL model can have multiple MY_CHANNEL_SETTINGS ( relationship is 1:N) */
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
    }

    /** channelId : The foreign key to the related CHANNEL record */
    @field('channel_id') channelId! : string

    /** notifyProps : Configurations with regards to this channel */
    @json('notify_props', (rawJson) => rawJson) notifyProps! : string[]

    /** channel : The parent Channel record */
    @relation(CHANNEL, 'channel_id') channel!: User
}

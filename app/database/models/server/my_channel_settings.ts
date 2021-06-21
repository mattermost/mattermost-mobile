// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import {field, immutableRelation, json} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import Channel from '@typings/database/models/servers/channel';
import {MM_TABLES} from '@constants/database';

const {CHANNEL, MY_CHANNEL_SETTINGS} = MM_TABLES.SERVER;

/**
 * The MyChannelSettings model represents the specific user's configuration to
 * the channel this user belongs to.
 */
export default class MyChannelSettings extends Model {
    /** table (name) : MyChannelSettings */
    static table = MY_CHANNEL_SETTINGS;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A CHANNEL is related to only one MY_CHANNEL_SETTINGS (relationship is 1:1) */
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
    };

    /** channel_id : The foreign key to the related CHANNEL record */
    @field('channel_id') channelId!: string;

    /** notify_props : Configurations with regards to this channel */
    @json('notify_props', (rawJson) => rawJson) notifyProps!: NotifyProps;

    /** channel : The relation pointing to the CHANNEL table */
    @immutableRelation(CHANNEL, 'channel_id') channel!: Relation<Channel>;
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {field, json, immutableRelation} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import Channel from '@typings/database/channel';

const {CHANNEL, MY_CHANNEL_SETTINGS} = MM_TABLES.SERVER;

/**
 * The MyChannelSettings model represents the specific user's configuration to
 * the channel this user belongs to.
 */
export default class MyChannelSettings extends Model {
    /** table (entity name) : MyChannelSettings */
    static table = MY_CHANNEL_SETTINGS;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {

        /** A CHANNEL is related to only one MY_CHANNEL_SETTINGS (relationship is 1:1) */
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
    };

    /** channel_id : The foreign key to the related CHANNEL record */
    @field('channel_id') channelId!: string;

    /** notify_props : Configurations with regards to this channel */
    @json('notify_props', (rawJson) => rawJson) notifyProps!: NotifyProps;

    /** channel : The relation pointing to entity CHANNEL */
    @immutableRelation(CHANNEL, 'channel_id') channel!: Relation<Channel>;
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import {immutableRelation, json} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {safeParseJSON} from '@utils/helpers';

import type ChannelModel from '@typings/database/models/servers/channel';

const {CHANNEL, MY_CHANNEL_SETTINGS} = MM_TABLES.SERVER;

/**
 * The MyChannelSettings model represents the specific user's configuration to
 * the channel this user belongs to.
 */
export default class MyChannelSettingsModel extends Model {
    /** table (name) : MyChannelSettings */
    static table = MY_CHANNEL_SETTINGS;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A CHANNEL is related to only one MY_CHANNEL_SETTINGS (relationship is 1:1) */
        [CHANNEL]: {type: 'belongs_to', key: 'id'},
    };

    /** notify_props : Configurations with regards to this channel */
    @json('notify_props', safeParseJSON) notifyProps!: ChannelNotifyProps;

    /** channel : The relation pointing to the CHANNEL table */
    @immutableRelation(CHANNEL, 'id') channel!: Relation<ChannelModel>;
}

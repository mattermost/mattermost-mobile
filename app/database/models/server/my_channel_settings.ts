// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {immutableRelation, json} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {safeParseJSON} from '@utils/helpers';

import type {Relation} from '@nozbe/watermelondb';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type MyChannelSettingsModelInterface from '@typings/database/models/servers/my_channel_settings';

const {MY_CHANNEL, MY_CHANNEL_SETTINGS} = MM_TABLES.SERVER;

/**
 * The MyChannelSettings model represents the specific user's configuration to
 * the channel this user belongs to.
 */
export default class MyChannelSettingsModel extends Model implements MyChannelSettingsModelInterface {
    /** table (name) : MyChannelSettings */
    static table = MY_CHANNEL_SETTINGS;

    static associations: Associations = {

        /** A MY_CHANNEL is associated with one MY_CHANNEL_SETTINGS (relationship is 1:1) **/
        [MY_CHANNEL]: {type: 'belongs_to', key: 'id'},
    };

    /** notify_props : Configurations in regard to this channel */
    @json('notify_props', safeParseJSON) notifyProps!: ChannelNotifyProps;

    /** channel : The relation pointing to the MY_CHANNEL table */
    @immutableRelation(MY_CHANNEL, 'id') myChannel!: Relation<MyChannelModel>;
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model from '@nozbe/watermelondb/Model';

import type MyChannelModel from './my_channel';

/**
 * The MyChannelSettings model represents the specific user's configuration to
 * the channel this user belongs to.
 */
export default class MyChannelSettingsModel extends Model {
    /** table (name) : MyChannelSettings */
    static table: string;

    /** notify_props : Configurations with regards to this channel */
    notifyProps: Partial<ChannelNotifyProps>;

    /** myChannel : The relation pointing to the MY_CHANNEL table */
    myChannel: Relation<MyChannelModel>;
}

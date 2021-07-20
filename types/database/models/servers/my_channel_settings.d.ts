// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

/**
 * The MyChannelSettings model represents the specific user's configuration to
 * the channel this user belongs to.
 */
export default class MyChannelSettingsModel extends Model {
    /** table (name) : MyChannelSettings */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** notify_props : Configurations with regards to this channel */
    notifyProps: Partial<ChannelNotifyProps>;

    /** channel : The relation pointing to the CHANNEL table */
    channel: Relation<ChannelModel>;
}

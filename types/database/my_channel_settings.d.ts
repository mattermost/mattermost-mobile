// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import Channel from '@typings/database/channel';

/**
 * The MyChannelSettings model represents the specific user's configuration to
 * the channel this user belongs to.
 */
export default class MyChannelSettings extends Model {
    /** table (entity name) : MyChannelSettings */
    static table: string;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations;

    /** channel_id : The foreign key to the related CHANNEL record */
    channelId: string;

    /** notify_props : Configurations with regards to this channel */
    notifyProps: NotifyProps;

    /** channel : The relation pointing to entity CHANNEL */
    channel: Relation<Channel>;
}

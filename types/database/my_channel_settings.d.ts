// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import User from '@typings/database/user';

/**
 * The MyChannelSettings model represents the specific user's configuration to
 * the channel that user belongs to.
 */
export default class MyChannelSettings extends Model {
    /** table (entity name) : MyChannelSettings */
    static table: string;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations;

    /** channelId : The foreign key to the related CHANNEL record */
    channelId: string;

    /** notifyProps : Configurations with regards to this channel */
    notifyProps: string[];

    /** channel : The parent Channel record */
    channel: User;
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

/**
 * The GroupsChannel links the Channel model with the Group model
 */
export default class GroupsChannelModel extends Model {
    /** table (name) : GroupsChannel */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** channel_id : The foreign key of the related CHANNEL model */
    channelId: string;

    /** group_id : The foreign key of the related GROUP model */
    groupId: string;

    /** channel : The related record to the parent Channel model */
    channel: Relation<ChannelModel>;

    /** group : The related record to the parent Group model */
    group: Relation<GroupModel>;
}

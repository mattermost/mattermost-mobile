// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import Channel from '@typings/database/channel';
import Group from '@typings/database/group';

/**
 * The GroupsInChannel links the Channel model with the Group model
 */
export default class GroupsInChannel extends Model {
    /** table (entity name) : GroupsInChannel */
    static table: string;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations;

    /** channel_id : The foreign key of the related CHANNEL model */
    channelId: string;

    /** group_id : The foreign key of the related GROUP model */
    groupId: string;

    /** member_count : The number of members in that group */
    memberCount: number;

    /** timezone_count : The number of timezones in that group */
    timezoneCount: number;

    /** channel : The related record to the parent Channel model */
    channel: Relation<Channel>;

    /** group : The related record to the parent Group model */
    group: Relation<Group>;
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {field, immutableRelation} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import Channel from '@typings/database/channel';
import Group from '@typings/database/group';

const {GROUP, GROUPS_IN_CHANNEL, CHANNEL} = MM_TABLES.SERVER;

/**
 * The GroupsInChannel links the Channel model with the Group model
 */
export default class GroupsInChannel extends Model {
    /** table (entity name) : GroupsInChannel */
    static table = GROUPS_IN_CHANNEL;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {

        /** A GROUP can be associated with multiple GROUPS_IN_CHANNEL (relationship is 1:N)  */
        [GROUP]: {type: 'belongs_to', key: 'group_id'},

        /** A CHANNEL can be associated with multiple GROUPS_IN_CHANNEL (relationship is 1:N)  */
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
    };

    /** channel_id : The foreign key of the related CHANNEL model */
    @field('channel_id') channelId!: string;

    /** group_id : The foreign key of the related GROUP model */
    @field('group_id') groupId!: string;

    /** member_count : The number of members in that group */
    @field('member_count') memberCount!: number;

    /** timezone_count : The number of timezones in that group */
    @field('timezone_count') timezoneCount!: number;

    /** channel : The related record to the parent Channel model */
    @immutableRelation(CHANNEL, 'channel_id') channel!: Relation<Channel>;

    /** group : The related record to the parent Group model */
    @immutableRelation(GROUP, 'group_id') group!: Relation<Group>;
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type ChannelModel from '@typings/database/models/servers/channel';
import type GroupModel from '@typings/database/models/servers/group';

const {GROUP, GROUPS_CHANNEL, CHANNEL} = MM_TABLES.SERVER;

/**
 * The GroupsChannel links the Channel model with the Group model
 */
export default class GroupsChannelModel extends Model {
    /** table (name) : GroupsChannel */
    static table = GROUPS_CHANNEL;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A GROUP can be associated with multiple GROUPS_CHANNEL (relationship is 1:N)  */
        [GROUP]: {type: 'belongs_to', key: 'group_id'},

        /** A CHANNEL can be associated with multiple GROUPS_CHANNEL (relationship is 1:N)  */
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
    };

    /** channel_id : The foreign key of the related CHANNEL model */
    @field('channel_id') channelId!: string;

    /** group_id : The foreign key of the related GROUP model */
    @field('group_id') groupId!: string;

    /** channel : The related record to the parent Channel model */
    @immutableRelation(CHANNEL, 'channel_id') channel!: Relation<ChannelModel>;

    /** group : The related record to the parent Group model */
    @immutableRelation(GROUP, 'group_id') group!: Relation<GroupModel>;
}

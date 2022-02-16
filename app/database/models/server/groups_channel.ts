// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
export {};

// groups: MM-41882 import {Relation} from '@nozbe/watermelondb';
// groups: MM-41882 import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
// groups: MM-41882 import Model, {Associations} from '@nozbe/watermelondb/Model';
// groups: MM-41882
// groups: MM-41882 import {MM_TABLES} from '@constants/database';
// groups: MM-41882
// groups: MM-41882 import type ChannelModel from '@typings/database/models/servers/channel';
// groups: MM-41882 import type GroupModel from '@typings/database/models/servers/group';
// groups: MM-41882
// groups: MM-41882 const {GROUP, GROUPS_CHANNEL, CHANNEL} = MM_TABLES.SERVER;
// groups: MM-41882
// groups: MM-41882 /**
// groups: MM-41882  * The GroupsChannel links the Channel model with the Group model
// groups: MM-41882  */
// groups: MM-41882 export default class GroupsChannelModel extends Model {
// groups: MM-41882     /** table (name) : GroupsChannel */
// groups: MM-41882     static table = GROUPS_CHANNEL;
// groups: MM-41882
// groups: MM-41882     /** associations : Describes every relationship to this table. */
// groups: MM-41882     static associations: Associations = {
// groups: MM-41882
// groups: MM-41882         /** A GROUP can be associated with multiple GROUPS_CHANNEL (relationship is 1:N)  */
// groups: MM-41882         [GROUP]: {type: 'belongs_to', key: 'group_id'},
// groups: MM-41882
// groups: MM-41882         /** A CHANNEL can be associated with multiple GROUPS_CHANNEL (relationship is 1:N)  */
// groups: MM-41882         [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
// groups: MM-41882     };
// groups: MM-41882
// groups: MM-41882     /** channel_id : The foreign key of the related CHANNEL model */
// groups: MM-41882     @field('channel_id') channelId!: string;
// groups: MM-41882
// groups: MM-41882     /** group_id : The foreign key of the related GROUP model */
// groups: MM-41882     @field('group_id') groupId!: string;
// groups: MM-41882
// groups: MM-41882     /** channel : The related record to the parent Channel model */
// groups: MM-41882     @immutableRelation(CHANNEL, 'channel_id') channel!: Relation<ChannelModel>;
// groups: MM-41882
// groups: MM-41882     /** group : The related record to the parent Group model */
// groups: MM-41882     @immutableRelation(GROUP, 'group_id') group!: Relation<GroupModel>;
// groups: MM-41882 }

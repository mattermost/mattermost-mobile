// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
export {};

// groups: MM-41882 import {Relation} from '@nozbe/watermelondb';
// groups: MM-41882 import Model, {Associations} from '@nozbe/watermelondb/Model';
// groups: MM-41882
// groups: MM-41882 /**
// groups: MM-41882  * The GroupsChannel links the Channel model with the Group model
// groups: MM-41882  */
// groups: MM-41882 export default class GroupsChannelModel extends Model {
// groups: MM-41882     /** table (name) : GroupsChannel */
// groups: MM-41882     static table: string;
// groups: MM-41882
// groups: MM-41882     /** associations : Describes every relationship to this table. */
// groups: MM-41882     static associations: Associations;
// groups: MM-41882
// groups: MM-41882     /** channel_id : The foreign key of the related CHANNEL model */
// groups: MM-41882     channelId: string;
// groups: MM-41882
// groups: MM-41882     /** group_id : The foreign key of the related GROUP model */
// groups: MM-41882     groupId: string;
// groups: MM-41882
// groups: MM-41882     /** channel : The related record to the parent Channel model */
// groups: MM-41882     channel: Relation<ChannelModel>;
// groups: MM-41882
// groups: MM-41882     /** group : The related record to the parent Group model */
// groups: MM-41882     group: Relation<GroupModel>;
// groups: MM-41882 }

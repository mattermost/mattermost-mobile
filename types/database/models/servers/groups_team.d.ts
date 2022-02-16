// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
export {};

// groups: MM-41882 import {Relation} from '@nozbe/watermelondb';
// groups: MM-41882 import Model, {Associations} from '@nozbe/watermelondb/Model';
// groups: MM-41882
// groups: MM-41882 /**
// groups: MM-41882  * The GroupsTeam links the Team model with the Group model
// groups: MM-41882  */
// groups: MM-41882 export default class GroupsTeamModel extends Model {
// groups: MM-41882     /** table (name) : GroupsTeam */
// groups: MM-41882     static table: string;
// groups: MM-41882
// groups: MM-41882     /** associations : Describes every relationship to this table. */
// groups: MM-41882     static associations: Associations;
// groups: MM-41882
// groups: MM-41882     /** group_id : The foreign key to the related Group record */
// groups: MM-41882     groupId: string;
// groups: MM-41882
// groups: MM-41882     /** member_count : The number of users in the group */
// groups: MM-41882     memberCount: number;
// groups: MM-41882
// groups: MM-41882     /** team_id : The foreign key to the related Team record */
// groups: MM-41882     teamId: string;
// groups: MM-41882
// groups: MM-41882     /** timezone_count : The number of timezones */
// groups: MM-41882     timezoneCount: number;
// groups: MM-41882
// groups: MM-41882     /** team : The related record to the parent Team model */
// groups: MM-41882     team: Relation<TeamModel>;
// groups: MM-41882
// groups: MM-41882     /** group : The related record to the parent Team model */
// groups: MM-41882     group: Relation<GroupModel>;
// groups: MM-41882 }

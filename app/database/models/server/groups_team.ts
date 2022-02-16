// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
export {};

// groups: MM-41882 import {Relation} from '@nozbe/watermelondb';
// groups: MM-41882 import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
// groups: MM-41882 import Model, {Associations} from '@nozbe/watermelondb/Model';
// groups: MM-41882
// groups: MM-41882 import {MM_TABLES} from '@constants/database';
// groups: MM-41882
// groups: MM-41882 import type GroupModel from '@typings/database/models/servers/group';
// groups: MM-41882 import type TeamModel from '@typings/database/models/servers/team';
// groups: MM-41882
// groups: MM-41882 const {GROUP, GROUPS_TEAM, TEAM} = MM_TABLES.SERVER;
// groups: MM-41882
// groups: MM-41882 /**
// groups: MM-41882  * The GroupsTeam links the Team model with the Group model
// groups: MM-41882  */
// groups: MM-41882 export default class GroupsTeamModel extends Model {
// groups: MM-41882     /** table (name) : GroupsTeam */
// groups: MM-41882     static table = GROUPS_TEAM;
// groups: MM-41882
// groups: MM-41882     /** associations : Describes every relationship to this table. */
// groups: MM-41882     static associations: Associations = {
// groups: MM-41882
// groups: MM-41882         /** GroupsTeam can belong to only one Group */
// groups: MM-41882         [GROUP]: {type: 'belongs_to', key: 'group_id'},
// groups: MM-41882
// groups: MM-41882         /** GroupsTeam can belong to only one Team */
// groups: MM-41882         [TEAM]: {type: 'belongs_to', key: 'team_id'},
// groups: MM-41882     };
// groups: MM-41882
// groups: MM-41882     /** group_id : The foreign key to the related Group record */
// groups: MM-41882     @field('group_id') groupId!: string;
// groups: MM-41882
// groups: MM-41882     /** team_id : The foreign key to the related Team record */
// groups: MM-41882     @field('team_id') teamId!: string;
// groups: MM-41882
// groups: MM-41882     /** team : The related record to the parent Team model */
// groups: MM-41882     @immutableRelation(TEAM, 'team_id') team!: Relation<TeamModel>;
// groups: MM-41882
// groups: MM-41882     /** group : The related record to the parent Team model */
// groups: MM-41882     @immutableRelation(GROUP, 'group_id') group!: Relation<GroupModel>;
// groups: MM-41882 }

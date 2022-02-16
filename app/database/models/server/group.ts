// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
export {};

// groups: MM-41882 import {children, field} from '@nozbe/watermelondb/decorators';
// groups: MM-41882 import Model, {Associations} from '@nozbe/watermelondb/Model';
// groups: MM-41882
// groups: MM-41882 import {MM_TABLES} from '@constants/database';
// groups: MM-41882
// groups: MM-41882 import type GroupMembershipModel from '@typings/database/models/servers/group_membership';
// groups: MM-41882 import type GroupsChannelModel from '@typings/database/models/servers/groups_channel';
// groups: MM-41882 import type GroupsTeamModel from '@typings/database/models/servers/groups_team';
// groups: MM-41882
// groups: MM-41882 const {GROUP, GROUPS_CHANNEL, GROUPS_TEAM, GROUP_MEMBERSHIP} = MM_TABLES.SERVER;
// groups: MM-41882
// groups: MM-41882 /**
// groups: MM-41882  * The Group model unifies/assembles users, teams and channels based on a common ground.  For example, a group can be
// groups: MM-41882  * all users who are in the mobile team.  If one needs to send that group a message, then s/he can mention the group's
// groups: MM-41882  * name in the message. (e.g @mobile_team)
// groups: MM-41882  */
// groups: MM-41882 export default class GroupModel extends Model {
// groups: MM-41882     /** table (name) : Group */
// groups: MM-41882     static table = GROUP;
// groups: MM-41882
// groups: MM-41882     /** associations : Describes every relationship to this table. */
// groups: MM-41882     static associations: Associations = {
// groups: MM-41882
// groups: MM-41882         /** A GROUP has a 1:N relationship with GROUPS_CHANNEL */
// groups: MM-41882         [GROUPS_CHANNEL]: {type: 'has_many', foreignKey: 'group_id'},
// groups: MM-41882
// groups: MM-41882         /** A GROUP has a 1:N relationship with GROUPS_TEAM */
// groups: MM-41882         [GROUPS_TEAM]: {type: 'has_many', foreignKey: 'group_id'},
// groups: MM-41882
// groups: MM-41882         /** A GROUP has a 1:N relationship with GROUP_MEMBERSHIP */
// groups: MM-41882         [GROUP_MEMBERSHIP]: {type: 'has_many', foreignKey: 'group_id'},
// groups: MM-41882     };
// groups: MM-41882
// groups: MM-41882     /** allow_reference : Determins if the group can be referenced in mentions */
// groups: MM-41882     @field('allow_reference') allowReference!: boolean;
// groups: MM-41882
// groups: MM-41882     /** delete_at : When the group was deleted */
// groups: MM-41882     @field('delete_at') deleteAt!: number;
// groups: MM-41882
// groups: MM-41882     /** display_name : The display name for the group */
// groups: MM-41882     @field('display_name') displayName!: string;
// groups: MM-41882
// groups: MM-41882     /** name : The name of the group */
// groups: MM-41882     @field('name') name!: string;
// groups: MM-41882
// groups: MM-41882     /** groupsChannel : All the related children records from GroupsChannel */
// groups: MM-41882     @children(GROUPS_CHANNEL) groupsChannel!: GroupsChannelModel[];
// groups: MM-41882
// groups: MM-41882     /** groupsTeam : All the related children records from GroupsTeam */
// groups: MM-41882     @children(GROUPS_TEAM) groupsTeam!: GroupsTeamModel[];
// groups: MM-41882
// groups: MM-41882     /** groupMemberships : All the related children records from GroupMembership */
// groups: MM-41882     // @children(GROUP_MEMBERSHIP) groupMemberships!: GroupMembershipModel[];
// groups: MM-41882 }

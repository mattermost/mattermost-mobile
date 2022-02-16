// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
export {};

// groups: MM-41882 import Model, {Associations} from '@nozbe/watermelondb/Model';
// groups: MM-41882
// groups: MM-41882 /**
// groups: MM-41882  * The Group model unifies/assembles users, teams and channels based on a common ground.  For example, a group can be
// groups: MM-41882  * all users who are in the mobile team.  If one needs to send that group a message, then s/he can mention the group's
// groups: MM-41882  * name in the message. (e.g @mobile_team)
// groups: MM-41882  */
// groups: MM-41882 export default class GroupModel extends Model {
// groups: MM-41882     /** table (name) : Group */
// groups: MM-41882     static table: string;
// groups: MM-41882
// groups: MM-41882     /** associations : Describes every relationship to this table. */
// groups: MM-41882     static associations: Associations;
// groups: MM-41882
// groups: MM-41882     /** allow_reference : Determins if the group can be referenced in mentions */
// groups: MM-41882     allowReference: boolean;
// groups: MM-41882
// groups: MM-41882     /** delete_at : When the group was deleted */
// groups: MM-41882     deleteAt: number;
// groups: MM-41882
// groups: MM-41882     /** display_name : The display name for the group */
// groups: MM-41882     displayName: string;
// groups: MM-41882
// groups: MM-41882     /** name : The name of the group */
// groups: MM-41882     name: string;
// groups: MM-41882
// groups: MM-41882     /** groupsChannel : All the related children records from GroupsChannel */
// groups: MM-41882     groupsChannel: Query<GroupsChannelModel>;
// groups: MM-41882
// groups: MM-41882     /** groupsTeam : All the related children records from GroupsTeam */
// groups: MM-41882     groupsTeam: Query<GroupsTeamModel>;
// groups: MM-41882
// groups: MM-41882     /** groupMemberships : All the related children records from GroupMembership */
// groups: MM-41882     // groupMemberships: Query<GroupMembershipModel>;
// groups: MM-41882 }

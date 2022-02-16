// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
export {};

// groups: MM-41882 import {Relation} from '@nozbe/watermelondb';
// groups: MM-41882 import Model, {Associations} from '@nozbe/watermelondb/Model';
// groups: MM-41882
// groups: MM-41882 /**
// groups: MM-41882  * The GroupMembership model represents the 'association table' where many groups have users and many users are in
// groups: MM-41882  * groups (relationship type N:N)
// groups: MM-41882  */
// groups: MM-41882 export default class GroupMembershipModel extends Model {
// groups: MM-41882     /** table (name) : GroupMembership */
// groups: MM-41882     static table: string;
// groups: MM-41882
// groups: MM-41882     /** associations : Describes every relationship to this table */
// groups: MM-41882     static associations: Associations;
// groups: MM-41882     groupId: string;
// groups: MM-41882     userId: string;
// groups: MM-41882
// groups: MM-41882     /** group : The related group this user belongs to */
// groups: MM-41882     group: Relation<GroupModel>;
// groups: MM-41882
// groups: MM-41882     /** user : The related user in the group */
// groups: MM-41882     user: Relation<UserModel>;
// groups: MM-41882 }

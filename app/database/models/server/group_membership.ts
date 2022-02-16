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
// groups: MM-41882 import type UserModel from '@typings/database/models/servers/user';
// groups: MM-41882
// groups: MM-41882 const {GROUP, GROUP_MEMBERSHIP, USER} = MM_TABLES.SERVER;
// groups: MM-41882
// groups: MM-41882 /**
// groups: MM-41882  * The GroupMembership model represents the 'association table' where many groups have users and many users are in
// groups: MM-41882  * groups (relationship type N:N)
// groups: MM-41882  */
// groups: MM-41882 export default class GroupMembershipModel extends Model {
// groups: MM-41882     /** table (name) : GroupMembership */
// groups: MM-41882     static table = GROUP_MEMBERSHIP;
// groups: MM-41882
// groups: MM-41882     /** associations : Describes every relationship to this table */
// groups: MM-41882     static associations: Associations = {
// groups: MM-41882
// groups: MM-41882         /** A GROUP can have multiple users in it */
// groups: MM-41882         [GROUP]: {type: 'belongs_to', key: 'group_id'},
// groups: MM-41882
// groups: MM-41882         /** A USER can be part of multiple groups */
// groups: MM-41882         [USER]: {type: 'belongs_to', key: 'user_id'},
// groups: MM-41882     };
// groups: MM-41882
// groups: MM-41882     /* group_id: The foreign key to the related Group record*/
// groups: MM-41882     @field('group_id') groupId!: string;
// groups: MM-41882
// groups: MM-41882     /* user_id: The foreign key to the related User record*/
// groups: MM-41882     @field('user_id') userId!: string;
// groups: MM-41882
// groups: MM-41882     /** group : The related group this user belongs to */
// groups: MM-41882     @immutableRelation(GROUP, 'group_id') group!: Relation<GroupModel>;
// groups: MM-41882
// groups: MM-41882     /** user : The related user in the group */
// groups: MM-41882     @immutableRelation(USER, 'user_id') user!: Relation<UserModel>;
// groups: MM-41882 }

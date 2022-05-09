// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import type GroupModel from './group';
import type UserModel from './user';

/**
 * The GroupMembership model represents the 'association table' where many groups have users and many users are in
 * groups (relationship type N:N)
 */
export default class GroupMembershipModel extends Model {
    /** table (name) : GroupMembership */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** group_id : The foreign key to the related Group record */
    groupId: string;

    /* user_id : The foreign key to the related User record*/
    userId: string;

    /** group : The related group */
    group: Relation<GroupModel>;

    /** user : The related user */
    member: Relation<UserModel>;
}

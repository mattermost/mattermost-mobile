// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type GroupModel from './group';
import type UserModel from './user';
import type {Relation, Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * The GroupMembership model represents the 'association table' where many groups have users and many users are in
 * groups (relationship type N:N)
 */
declare class GroupMembershipModel extends Model {
    /** table (name) : GroupMembership */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** group_id : The foreign key to the related Group record */
    groupId: string;

    /* user_id : The foreign key to the related User record*/
    userId: string;

    /** created_at : The timestamp for when it was created */
    createdAt: number;

    /** updated_at : The timestamp for when it was updated */
    updatedAt: number;

    /** deleted_at : The timestamp for when it was deleted */
    deletedAt: number;

    /** group : The related group */
    group: Relation<GroupModel>;

    /** user : The related user */
    member: Relation<UserModel>;
}

export default GroupMembershipModel;

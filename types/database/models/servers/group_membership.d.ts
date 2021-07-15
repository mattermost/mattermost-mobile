// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Query, Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

/**
 * The GroupMembership model represents the 'association table' where many groups have users and many users are in
 * groups (relationship type N:N)
 */
export default class GroupMembershipModel extends Model {
    /** table (name) : GroupMembership */
    static table: string;

    /** associations : Describes every relationship to this table */
    static associations: Associations;
    groupId: string;
    userId: string;

    /** memberGroup : The related group this user belongs to */
    memberGroup: Relation<GroupModel>;

    /** memberUser : The related user in the group */
    memberUser: Relation<UserModel>;

    /**
     * getAllGroupsForUser : Retrieves all the groups that the user is part of
     */
    getAllGroupsForUser: Query<GroupModel>;

    /**
     * getAllUsersInGroup : Retrieves all the users who are part of this group
     */
    getAllUsersInGroup: Query<UserModel>;
}

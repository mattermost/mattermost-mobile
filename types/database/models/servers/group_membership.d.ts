// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
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

    /** group : The related group this user belongs to */
    group: Relation<GroupModel>;

    /** user : The related user in the group */
    user: Relation<UserModel>;
}

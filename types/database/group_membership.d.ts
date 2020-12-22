// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import Group from '@typings/database/group';
import User from '@typings/database/user';

/**
 * The GroupMembership model represents the 'association table' where many groups have users and many users are in
 * groups (relationship type N:N)
 */
export default class GroupMembership extends Model {
    /** table (entity name) : GroupMembership */
    static table: string;

    /** associations : Describes every relationship to this entity */
    static associations: Associations;

    /** memberGroup : The related group this user belongs to */
    group: Relation<Group>;

    /** memberUser : The related user in the group */
    user: Relation<User>;
}

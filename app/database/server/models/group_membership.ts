// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, Query, Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {field, immutableRelation, lazy} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import Group from '@typings/database/group';
import User from '@typings/database/user';

const {GROUP, GROUP_MEMBERSHIP, USER} = MM_TABLES.SERVER;

/**
 * The GroupMembership model represents the 'association table' where many groups have users and many users are in
 * groups (relationship type N:N)
 */
export default class GroupMembership extends Model {
    /** table (entity name) : GroupMembership */
    static table = GROUP_MEMBERSHIP;

    /** associations : Describes every relationship to this entity */
    static associations: Associations = {

        /** A GROUP can have multiple users in it */
        [GROUP]: {type: 'belongs_to', key: 'group_id'},

        /** A USER can be part of multiple groups */
        [USER]: {type: 'belongs_to', key: 'user_id'},
    };

    /* group_id: The foreign key to the related Group record*/
    @field('group_id') groupId!: string;

    /* user_id: The foreign key to the related User record*/
    @field('user_id') userId!: string;

    /** memberGroup : The related group this user belongs to */
    @immutableRelation(GROUP, 'group_id') memberGroup!: Relation<Group>;

    /** memberUser : The related user in the group */
    @immutableRelation(USER, 'user_id') memberUser!: Relation<User>;

    /**
     * getAllGroupsForUser : Retrieves all the groups that the user is part of
     */
    @lazy getAllGroupsForUser = this.collections.get(GROUP).query(Q.on(USER, 'id', this.userId)) as Query<Group>

    /**
     * getAllUsersInGroup : Retrieves all the users who are part of this group
     */
    @lazy getAllUsersInGroup = this.collections.get(USER).query(Q.on(GROUP, 'id', this.groupId)) as Query<User>
}

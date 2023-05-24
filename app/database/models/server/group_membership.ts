// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type {Relation} from '@nozbe/watermelondb';
import type GroupModel from '@typings/database/models/servers/group';
import type GroupMembershipInterface from '@typings/database/models/servers/group_membership';
import type UserModel from '@typings/database/models/servers/user';

const {USER, GROUP, GROUP_MEMBERSHIP} = MM_TABLES.SERVER;

/**
 * The GroupMembership model represents the 'association table' where many groups have users and many users are in
 * groups (relationship type N:N)
 */
export default class GroupMembershipModel extends Model implements GroupMembershipInterface {
    /** table (name) : GroupMembership */
    static table = GROUP_MEMBERSHIP;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A GroupMembership belongs to a Group */
        [GROUP]: {type: 'belongs_to', key: 'group_id'},

        /** A GroupMembership has a User */
        [USER]: {type: 'belongs_to', key: 'user_id'},
    };

    /** group_id : The foreign key to the related Group record */
    @field('group_id') groupId!: string;

    /** user_id : The foreign key to the related User record */
    @field('user_id') userId!: string;

    /** created_at : The creation date for this row */
    @field('created_at') createdAt!: number;

    /** updated_at : The update date for this row */
    @field('updated_at') updatedAt!: number;

    /** deleted_at : The delete date for this row */
    @field('deleted_at') deletedAt!: number;

    /** group : The related group */
    @immutableRelation(GROUP, 'group_id') group!: Relation<GroupModel>;

    /** member : The related member */
    @immutableRelation(USER, 'user_id') member!: Relation<UserModel>;
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type {Relation} from '@nozbe/watermelondb';
import type GroupModel from '@typings/database/models/servers/group';
import type GroupTeamInterface from '@typings/database/models/servers/group_team';
import type TeamModel from '@typings/database/models/servers/team';

const {TEAM, GROUP, GROUP_TEAM} = MM_TABLES.SERVER;

/**
 * The GroupTeam model represents the 'association table' where many groups have teams and many teams are in
 * groups (relationship type N:N)
 */
export default class GroupTeamModel extends Model implements GroupTeamInterface {
    /** table (name) : GroupTeam */
    static table = GROUP_TEAM;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A GroupTeam belongs to a Group */
        [GROUP]: {type: 'belongs_to', key: 'group_id'},

        /** A GroupTeam has a Team */
        [TEAM]: {type: 'belongs_to', key: 'team_id'},
    };

    /** group_id : The foreign key to the related Group record */
    @field('group_id') groupId!: string;

    /** team_id : The foreign key to the related Team record */
    @field('team_id') teamId!: string;

    /** created_at : The creation date for this row */
    @field('created_at') createdAt!: number;

    /** updated_at : The update date for this row */
    @field('updated_at') updatedAt!: number;

    /** deleted_at : The delete date for this row */
    @field('deleted_at') deletedAt!: number;

    /** group : The related group */
    @immutableRelation(GROUP, 'group_id') group!: Relation<GroupModel>;

    /** team : The related team */
    @immutableRelation(TEAM, 'team_id') team!: Relation<TeamModel>;
}

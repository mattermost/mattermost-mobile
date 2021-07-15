// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type GroupModel from '@typings/database/models/servers/group';
import type TeamModel from '@typings/database/models/servers/team';

const {GROUP, GROUPS_IN_TEAM, TEAM} = MM_TABLES.SERVER;

/**
 * The GroupsInTeam links the Team model with the Group model
 */
export default class GroupsInTeamModel extends Model {
    /** table (name) : GroupsInTeam */
    static table = GROUPS_IN_TEAM;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** GroupsInTeam can belong to only one Group */
        [GROUP]: {type: 'belongs_to', key: 'group_id'},

        /** GroupsInTeam can belong to only one Team */
        [TEAM]: {type: 'belongs_to', key: 'team_id'},
    };

    /** group_id : The foreign key to the related Group record */
    @field('group_id') groupId!: string;

    /** team_id : The foreign key to the related Team record */
    @field('team_id') teamId!: string;

    /** team : The related record to the parent Team model */
    @immutableRelation(TEAM, 'team_id') team!: Relation<TeamModel>;

    /** group : The related record to the parent Team model */
    @immutableRelation(GROUP, 'group_id') group!: Relation<GroupModel>;
}

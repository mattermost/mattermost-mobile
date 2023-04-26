// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, Relation} from '@nozbe/watermelondb';
import {field, immutableRelation, lazy} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type TeamModel from '@typings/database/models/servers/team';
import type TeamMembershipModelInterface from '@typings/database/models/servers/team_membership';
import type UserModel from '@typings/database/models/servers/user';

const {TEAM, TEAM_MEMBERSHIP, USER} = MM_TABLES.SERVER;

/**
 * The TeamMembership model represents the 'association table' where many teams have users and many users are in
 * teams (relationship type N:N)
 */
export default class TeamMembershipModel extends Model implements TeamMembershipModelInterface {
    /** table (name) : TeamMembership */
    static table = TEAM_MEMBERSHIP;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** TEAM and TEAM_MEMBERSHIP share a 1:N relationship;  USER can be part of multiple teams */
        [TEAM]: {type: 'belongs_to', key: 'team_id'},

        /** USER and TEAM_MEMBERSHIP share a 1:N relationship;  A TEAM can regroup multiple users */
        [USER]: {type: 'belongs_to', key: 'user_id'},
    };

    /** team_id : The foreign key to the related Team record */
    @field('team_id') teamId!: string;

    /* user_id: The foreign key to the related User record*/
    @field('user_id') userId!: string;

    /* scheme_admin: Determines if the user is an admin of the team*/
    @field('scheme_admin') schemeAdmin!: boolean;

    /** memberUser: The related user in the team */
    @immutableRelation(USER, 'user_id') memberUser!: Relation<UserModel>;

    /** memberTeam : The related team of users */
    @immutableRelation(TEAM, 'team_id') memberTeam!: Relation<TeamModel>;

    /**
     * getAllTeamsForUser - Retrieves all the teams that the user is part of
     */
    @lazy getAllTeamsForUser = this.collections.get<TeamModel>(TEAM).query(Q.on(USER, 'id', this.userId));

    /**
     * getAllUsersInTeam - Retrieves all the users who are part of this team
     */
    @lazy getAllUsersInTeam = this.collections.get<UserModel>(USER).query(Q.on(TEAM, 'id', this.teamId));
}

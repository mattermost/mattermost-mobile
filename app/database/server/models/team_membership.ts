// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {immutableRelation} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import User from '@typings/database/user';
import Team from '@typings/database/team';

const {TEAM, TEAM_MEMBERSHIP, USER} = MM_TABLES.SERVER;

/**
 * The TeamMembership model represents the 'association table' where many teams have users and many users are in
 * teams (relationship type N:N)
 */
export default class TeamMembership extends Model {
    /** table (entity name) : TeamMembership */
    static table = TEAM_MEMBERSHIP;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {

        /** A USER can be part of multiple teams */
        [TEAM]: {type: 'belongs_to', key: 'team_id'},

        /** A TEAM can regroup multiple users */
        [USER]: {type: 'belongs_to', key: 'user_id'},
    };

    /** memberUser: The related user in the team */
    @immutableRelation(USER, 'user_id') memberUser!: Relation<User>;

    /** memberTeam : The related team of users */
    @immutableRelation(TEAM, 'team_id') memberTeam!: Relation<Team>;

    /**
     * getAllTeamsForUser - Retrieves all the teams that the user is part of
     * @returns {Promise<Team[]>}
     */
    getAllTeamsForUser = async () : Promise<Team[]> => {
        const memberUser = await this.memberUser.fetch();
        const teams = await this.collections.get(TEAM).query(Q.on(USER, 'id', memberUser!.id)).fetch() as Team[];
        return teams;
    }

    /**
     * getAllUsersInTeam - Retrieves all the users who are part of this team
     * @returns {Promise<User[]>}
     */
    getAllUsersInTeam = async () : Promise<User[]> => {
        const memberTeam = await this.memberTeam.fetch();
        const users = await this.collections.get(USER).query(Q.on(TEAM, 'id', memberTeam!.id)).fetch() as User[];
        return users;
    }
}

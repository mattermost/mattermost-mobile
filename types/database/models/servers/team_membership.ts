// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type TeamModel from './team';
import type UserModel from './user';
import type {Query, Relation, Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * The TeamMembership model represents the 'association table' where many teams have users and many users are in
 * teams (relationship type N:N)
 */
declare class TeamMembershipModel extends Model {
    /** table (name) : TeamMembership */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** team_id : The foreign key to the related Team record */
    teamId: string;

    /* user_id: The foreign key to the related User record*/
    userId: string;

    /* scheme_admin: Determines if the user is an admin of the channel*/
    schemeAdmin: boolean;

    /** memberUser: The related user in the team */
    memberUser: Relation<UserModel>;

    /** memberTeam : The related team of users */
    memberTeam: Relation<TeamModel>;

    /**
     * getAllTeamsForUser - Retrieves all the teams that the user is part of
     */
    getAllTeamsForUser: Query<TeamModel>;

    /**
     * getAllUsersInTeam - Retrieves all the users who are part of this team
     */
    getAllUsersInTeam: Query<UserModel>;
}

export default TeamMembershipModel;

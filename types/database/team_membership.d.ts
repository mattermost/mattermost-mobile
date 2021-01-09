// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import User from '@typings/database/user';
import Team from '@typings/database/team';

/**
 * The TeamMembership model represents the 'association table' where many teams have users and many users are in
 * teams (relationship type N:N)
 */
export default class TeamMembership extends Model {
    /** table (entity name) : TeamMembership */
    static table: string;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations;

    /** memberUser: The related user in the team */
    memberUser: Relation<User>;

    /** memberTeam : The related team of users */
    memberTeam: Relation<Team>;

    /**
     * getAllTeamsForUser - Retrieves all the teams that the user is part of
     * @returns {Promise<Team[]>}
     */
    getAllTeamsForUser: () => Promise<Team[]>;

    /**
     * getAllUsersInTeam - Retrieves all the users who are part of this team
     * @returns {Promise<User[]>}
     */
    getAllUsersInTeam: () => Promise<User[]>;
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';
import {immutableRelation} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import User from '@typings/database/user';
import Team from '@typings/database/team';

const {TEAM, TEAM_MEMBERSHIP, USER} = MM_TABLES.SERVER;

/**
 * The TeamMembership model represents the 'association table' where many teams have users and many users are in
 * teams ( relationship type N:N)
 */
export default class TeamMembership extends Model {
    /** table (entity name) : ChannelMembership */
    static table = TEAM_MEMBERSHIP

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {
        [TEAM]: {type: 'belongs_to', key: 'team_id'},
        [USER]: {type: 'belongs_to', key: 'user_id'},
    }

    /** memberUser: The related user in the teams */
    @immutableRelation(USER, 'user_id') memberUser! : User

    /** memberTeam : The related team of users */
    @immutableRelation(TEAM, 'team_id') memberTeam! : Team
}

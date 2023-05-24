// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, relation} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type {Relation} from '@nozbe/watermelondb';
import type MyTeamModelInterface from '@typings/database/models/servers/my_team';
import type TeamModel from '@typings/database/models/servers/team';

const {TEAM, MY_TEAM} = MM_TABLES.SERVER;

/**
 * MyTeam represents only the teams that the current user belongs to
 */
export default class MyTeamModel extends Model implements MyTeamModelInterface {
    /** table (name) : MyTeam */
    static table = MY_TEAM;

    static associations: Associations = {

        /** A TEAM is associated to one MY_TEAM (relationship is 1:1) */
        [TEAM]: {type: 'belongs_to', key: 'id'},
    };

    /** roles : The different permissions that this user has in the team, concatenated together with comma to form a single string. */
    @field('roles') roles!: string;

    /** team : The relation to the TEAM, that this user belongs to  */
    @relation(TEAM, 'id') team!: Relation<TeamModel>;
}

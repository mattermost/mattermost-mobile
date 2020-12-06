// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';
import {field, relation} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import User from '@typings/database/user';
import Team from '@typings/database/team';

const {TEAM, TEAM_MEMBERSHIP, USER} = MM_TABLES.SERVER;

export default class TeamMembership extends Model {
    static table = TEAM_MEMBERSHIP
    static associations: Associations = {
        [TEAM]: {type: 'belongs_to', key: 'team_id'},
        [USER]: {type: 'belongs_to', key: 'user_id'},
    }

    @field('team_id') teamId!: string
    @field('user_id') userId!: string

    @relation(USER, 'user_id') memberUser! : User
    @relation(TEAM, 'team_id') memberTeam! : Team
}

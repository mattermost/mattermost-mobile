// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import field from '@nozbe/watermelondb/decorators/field';
import relation from '@nozbe/watermelondb/decorators/relation';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import Team from '@typings/database/team';

const {GROUP, GROUPS_IN_TEAM, TEAM} = MM_TABLES.SERVER;

export default class GroupsInTeam extends Model {
    static table = GROUPS_IN_TEAM
    static associations: Associations = {
        [GROUP]: {type: 'belongs_to', key: 'group_id'},
        [TEAM]: {type: 'belongs_to', key: 'team_id'},
    }

    @field('group_id') groupId!: string
    @field('member_count') memberCount!: number
    @field('team_id') teamId!: string
    @field('timezone_count') timezoneCount!: number

    @relation(TEAM, 'team_id') groupTeam!: Team
}

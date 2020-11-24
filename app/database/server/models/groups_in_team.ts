// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {MM_TABLES} from '@constants/database';
import field from '@nozbe/watermelondb/decorators/field';
import relation from '@nozbe/watermelondb/decorators/relation';
import Team from '@typings/database/team';

export default class GroupsInTeam extends Model {
    static table = MM_TABLES.SERVER.GROUPS_IN_TEAM
    static associations: Associations = {
        [MM_TABLES.SERVER.GROUP]: {type: 'belongs_to', key: 'group_id'},
        [MM_TABLES.SERVER.TEAM]: {type: 'belongs_to', key: 'team_id'},
    }

    @field('group_id') groupId!: string
    @field('member_count') memberCount!: number
    @field('team_id') teamId!: string
    @field('timezone_count') timezoneCount!: number

    @relation(MM_TABLES.SERVER.TEAM, 'team_id') groupTeam!: Team
}

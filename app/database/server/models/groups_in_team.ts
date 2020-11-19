// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {MM_TABLES} from '@constants/database';
import field from '@nozbe/watermelondb/decorators/field';

export default class GroupsInTeam extends Model {
    static table = MM_TABLES.SERVER.GROUPS_IN_TEAM
    static associations: Associations = {
        [MM_TABLES.SERVER.GROUP]: {type: 'belongs_to', key: 'group_id'},
    }

    @field('group_id') groupId!: string
    @field('member_count') memberCount!: number
    @field('team_id') teamId!: string
    @field('timezone_count') timezoneCount!: number

    // FIXME :  add association to team table
}

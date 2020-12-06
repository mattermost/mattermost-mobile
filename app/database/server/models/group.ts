// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import children from '@nozbe/watermelondb/decorators/children';
import field from '@nozbe/watermelondb/decorators/field';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import GroupMembership from '@typings/database/group_membership';
import GroupsInChannel from '@typings/database/groups_in_channel';
import GroupsInTeam from '@typings/database/groups_in_team';

const {GROUP, GROUPS_IN_CHANNEL, GROUPS_IN_TEAM, GROUP_MEMBERSHIP} = MM_TABLES.SERVER;

export default class Group extends Model {
    static table = GROUP

    static associations: Associations = {
        [GROUPS_IN_CHANNEL]: {type: 'has_many', foreignKey: 'group_id'},
        [GROUPS_IN_TEAM]: {type: 'has_many', foreignKey: 'group_id'},
        [GROUP_MEMBERSHIP]: {type: 'has_many', foreignKey: 'group_id'},
    }

    @field('display_name') displayName!: string
    @field('name') name!: string

    @children(GROUPS_IN_CHANNEL) groupsInChannel!: GroupsInChannel
    @children(GROUPS_IN_TEAM) groupsInTeam!: GroupsInTeam
    @children(GROUP_MEMBERSHIP) groupMembership!: GroupMembership
}

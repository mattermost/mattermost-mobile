// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';
import {MM_TABLES} from '@constants/database';
import field from '@nozbe/watermelondb/decorators/field';
import children from '@nozbe/watermelondb/decorators/children';
import GroupsInChannel from '@typings/database/groups_in_channel';
import GroupsInTeam from '@typings/database/groups_in_team';
import GroupMembership from '@typings/database/group_membership';

export default class Group extends Model {
    static table = MM_TABLES.SERVER.GROUP
    static associations: Associations = {
        [MM_TABLES.SERVER.GROUPS_IN_CHANNEL]: {type: 'has_many', foreignKey: 'group_id'},
        [MM_TABLES.SERVER.GROUPS_IN_TEAM]: {type: 'has_many', foreignKey: 'group_id'},
        [MM_TABLES.SERVER.GROUP_MEMBERSHIP]: {type: 'has_many', foreignKey: 'group_id'},
    }

    @field('display_name') displayName!: string
    @field('group_id') groupId!: string
    @field('name') name!: string

    // FIXME : add relationship fieds now
    @children(MM_TABLES.SERVER.GROUPS_IN_CHANNEL) groupsInChannel!: GroupsInChannel
    @children(MM_TABLES.SERVER.GROUPS_IN_TEAM) groupsInTeam!: GroupsInTeam
    @children(MM_TABLES.SERVER.GROUP_MEMBERSHIP) groupMembership!: GroupMembership
}

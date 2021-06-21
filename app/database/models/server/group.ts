// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';
import {children, field} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import GroupMembership from '@typings/database/models/servers/group_membership';
import GroupsInChannel from '@typings/database/models/servers/groups_in_channel';
import GroupsInTeam from '@typings/database/models/servers/groups_in_team';

const {GROUP, GROUPS_IN_CHANNEL, GROUPS_IN_TEAM, GROUP_MEMBERSHIP} = MM_TABLES.SERVER;

/**
 * The Group model unifies/assembles users, teams and channels based on a common ground.  For example, a group can be
 * all users who are in the mobile team.  If one needs to send that group a message, then s/he can mention the group's
 * name in the message. (e.g @mobile_team)
 */
export default class Group extends Model {
    /** table (name) : Group */
    static table = GROUP;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A GROUP has a 1:N relationship with GROUPS_IN_CHANNEL */
        [GROUPS_IN_CHANNEL]: {type: 'has_many', foreignKey: 'group_id'},

        /** A GROUP has a 1:N relationship with GROUPS_IN_TEAM */
        [GROUPS_IN_TEAM]: {type: 'has_many', foreignKey: 'group_id'},

        /** A GROUP has a 1:N relationship with GROUP_MEMBERSHIP */
        [GROUP_MEMBERSHIP]: {type: 'has_many', foreignKey: 'group_id'},
    };

    /** display_name : The display name for the group */
    @field('display_name') displayName!: string;

    /** name : The name of the group */
    @field('name') name!: string;

    /** groupsInChannel : All the related children records from GroupsInChannel */
    @children(GROUPS_IN_CHANNEL) groupsInChannel!: GroupsInChannel[];

    /** groupsInTeam : All the related children records from GroupsInTeam */
    @children(GROUPS_IN_TEAM) groupsInTeam!: GroupsInTeam[];

    /** groupMemberships : All the related children records from GroupMembership */
    @children(GROUP_MEMBERSHIP) groupMemberships!: GroupMembership[];
}

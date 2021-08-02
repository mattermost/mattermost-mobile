// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';
import {children, field} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';

import type GroupMembershipModel from '@typings/database/models/servers/group_membership';
import type GroupsChannelModel from '@typings/database/models/servers/groups_channel';
import type GroupsTeamModel from '@typings/database/models/servers/groups_team';

const {GROUP, GROUPS_CHANNEL, GROUPS_TEAM, GROUP_MEMBERSHIP} = MM_TABLES.SERVER;

/**
 * The Group model unifies/assembles users, teams and channels based on a common ground.  For example, a group can be
 * all users who are in the mobile team.  If one needs to send that group a message, then s/he can mention the group's
 * name in the message. (e.g @mobile_team)
 */
export default class GroupModel extends Model {
    /** table (name) : Group */
    static table = GROUP;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A GROUP has a 1:N relationship with GROUPS_CHANNEL */
        [GROUPS_CHANNEL]: {type: 'has_many', foreignKey: 'group_id'},

        /** A GROUP has a 1:N relationship with GROUPS_TEAM */
        [GROUPS_TEAM]: {type: 'has_many', foreignKey: 'group_id'},

        /** A GROUP has a 1:N relationship with GROUP_MEMBERSHIP */
        [GROUP_MEMBERSHIP]: {type: 'has_many', foreignKey: 'group_id'},
    };

    /** allow_reference : Determins if the group can be referenced in mentions */
    @field('allow_reference') allowReference!: boolean;

    /** delete_at : When the group was deleted */
    @field('delete_at') deleteAt!: number;

    /** display_name : The display name for the group */
    @field('display_name') displayName!: string;

    /** name : The name of the group */
    @field('name') name!: string;

    /** groupsChannel : All the related children records from GroupsChannel */
    @children(GROUPS_CHANNEL) groupsChannel!: GroupsChannelModel[];

    /** groupsTeam : All the related children records from GroupsTeam */
    @children(GROUPS_TEAM) groupsTeam!: GroupsTeamModel[];

    /** groupMemberships : All the related children records from GroupMembership */
    @children(GROUP_MEMBERSHIP) groupMemberships!: GroupMembershipModel[];
}

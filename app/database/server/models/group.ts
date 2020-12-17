// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';
import {children, field} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import GroupMembership from '@typings/database/group_membership';
import GroupsInChannel from '@typings/database/groups_in_channel';
import GroupsInTeam from '@typings/database/groups_in_team';

const {GROUP, GROUPS_IN_CHANNEL, GROUPS_IN_TEAM, GROUP_MEMBERSHIP} = MM_TABLES.SERVER;

/**
 * The Group model unifies the shareholders that contribute a group message.
 */
export default class Group extends Model {
    /** table (entity name) : Group */
    static table = GROUP;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {

        /** A GROUP has a 1:N relationship with GROUPS_IN_CHANNEL */
        [GROUPS_IN_CHANNEL]: {type: 'has_many', foreignKey: 'group_id'},

        /** A GROUP has a 1:N relationship with GROUPS_IN_TEAM */
        [GROUPS_IN_TEAM]: {type: 'has_many', foreignKey: 'group_id'},

        /** A GROUP has a 1:N relationship with GROUP_MEMBERSHIP */
        [GROUP_MEMBERSHIP]: {type: 'has_many', foreignKey: 'group_id'},
    };

    /** display_name : The display name for the group */
    @field('display_name') displayName: string | undefined;

    /** name : The name of the group */
    @field('name') name: string | undefined;

    /** groupsInChannel : All the related children records from GroupsInChannel */
    @children(GROUPS_IN_CHANNEL) groupsInChannel: GroupsInChannel | undefined;

    /** groupsInChannel : All the related children records from GroupsInTeam */
    @children(GROUPS_IN_TEAM) groupsInTeam: GroupsInTeam | undefined;

    /** groupsInChannel : All the related children records from GroupMembership */
    @children(GROUP_MEMBERSHIP) groupMembership: GroupMembership | undefined;
}

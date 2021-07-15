// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';

import type {TransformerArgs} from '@typings/database/database';
import {OperationType} from '@typings/database/enums';
import type GroupModel from '@typings/database/models/servers/group';
import type GroupMembershipModel from '@typings/database/models/servers/group_membership';
import type GroupsInChannelModel from '@typings/database/models/servers/groups_in_channel';
import type GroupsInTeamModel from '@typings/database/models/servers/groups_in_team';

const {
    GROUP,
    GROUPS_IN_CHANNEL,
    GROUPS_IN_TEAM,
    GROUP_MEMBERSHIP,
} = MM_TABLES.SERVER;

/**
 * transformGroupMembershipRecord: Prepares a record of the SERVER database 'GroupMembership' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<GroupMembershipModel>}
 */
export const transformGroupMembershipRecord = ({action, database, value}: TransformerArgs): Promise<GroupMembershipModel> => {
    const raw = value.raw as GroupMembership;
    const record = value.record as GroupMembershipModel;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (groupMember: GroupMembershipModel) => {
        groupMember._raw.id = isCreateAction ? (raw?.id ?? groupMember.id) : record.id;
        groupMember.groupId = raw.group_id;
        groupMember.userId = raw.user_id;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: GROUP_MEMBERSHIP,
        value,
        fieldsMapper,
    }) as Promise<GroupMembershipModel>;
};

/**
 * transformGroupRecord: Prepares a record of the SERVER database 'Group' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<GroupModel>}
 */
export const transformGroupRecord = ({action, database, value}: TransformerArgs): Promise<GroupModel> => {
    const raw = value.raw as Group;
    const record = value.record as GroupModel;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (group: GroupModel) => {
        group._raw.id = isCreateAction ? (raw?.id ?? group.id) : record.id;
        group.name = raw.name;
        group.displayName = raw.display_name;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: GROUP,
        value,
        fieldsMapper,
    }) as Promise<GroupModel>;
};

/**
 * transformGroupsInTeamRecord: Prepares a record of the SERVER database 'GroupsInTeam' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<GroupsInTeamModel>}
 */
export const transformGroupsInTeamRecord = ({action, database, value}: TransformerArgs): Promise<GroupsInTeamModel> => {
    const raw = value.raw as GroupTeam;
    const record = value.record as GroupsInTeamModel;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (groupsInTeam: GroupsInTeamModel) => {
        groupsInTeam._raw.id = isCreateAction ? groupsInTeam.id : record.id;
        groupsInTeam.teamId = raw.team_id;
        groupsInTeam.groupId = raw.group_id;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: GROUPS_IN_TEAM,
        value,
        fieldsMapper,
    }) as Promise<GroupsInTeamModel>;
};

/**
 * transformGroupsInChannelRecord: Prepares a record of the SERVER database 'GroupsInChannel' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<GroupsInChannelModel>}
 */
export const transformGroupsInChannelRecord = ({action, database, value}: TransformerArgs): Promise<GroupsInChannelModel> => {
    const raw = value.raw as GroupChannel;
    const record = value.record as GroupsInChannelModel;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (groupsInChannel: GroupsInChannelModel) => {
        groupsInChannel._raw.id = isCreateAction ? groupsInChannel.id : record.id;
        groupsInChannel.channelId = raw.channel_id;
        groupsInChannel.groupId = raw.group_id;
        groupsInChannel.memberCount = raw.member_count;
        groupsInChannel.timezoneCount = raw.timezone_count;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: GROUPS_IN_CHANNEL,
        value,
        fieldsMapper,
    }) as Promise<GroupsInChannelModel>;
};

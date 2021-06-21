// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';
import {
    TransformerArgs,
    RawGroup,
    RawGroupMembership,
    RawGroupsInChannel,
    RawGroupsInTeam,
} from '@typings/database/database';
import {OperationType} from '@typings/database/enums';
import Group from '@typings/database/models/servers/group';
import GroupMembership from '@typings/database/models/servers/group_membership';
import GroupsInChannel from '@typings/database/models/servers/groups_in_channel';
import GroupsInTeam from '@typings/database/models/servers/groups_in_team';

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
 * @returns {Promise<Model>}
 */
export const transformGroupMembershipRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawGroupMembership;
    const record = value.record as GroupMembership;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (groupMember: GroupMembership) => {
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
    });
};

/**
 * transformGroupRecord: Prepares a record of the SERVER database 'Group' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformGroupRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawGroup;
    const record = value.record as Group;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (group: Group) => {
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
    });
};

/**
 * transformGroupsInTeamRecord: Prepares a record of the SERVER database 'GroupsInTeam' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformGroupsInTeamRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawGroupsInTeam;
    const record = value.record as GroupsInTeam;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (groupsInTeam: GroupsInTeam) => {
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
    });
};

/**
 * transformGroupsInChannelRecord: Prepares a record of the SERVER database 'GroupsInChannel' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformGroupsInChannelRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawGroupsInChannel;
    const record = value.record as GroupsInChannel;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (groupsInChannel: GroupsInChannel) => {
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
    });
};

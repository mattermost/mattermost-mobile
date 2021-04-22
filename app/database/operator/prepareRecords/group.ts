// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/prepareRecords/index';
import {
    DataFactoryArgs,
    RawGroup,
    RawGroupMembership,
    RawGroupsInChannel,
    RawGroupsInTeam,
} from '@typings/database/database';
import {OperationType} from '@typings/database/enums';
import Group from '@typings/database/group';
import GroupMembership from '@typings/database/group_membership';
import GroupsInChannel from '@typings/database/groups_in_channel';
import GroupsInTeam from '@typings/database/groups_in_team';

const {
    GROUP,
    GROUPS_IN_CHANNEL,
    GROUPS_IN_TEAM,
    GROUP_MEMBERSHIP,
} = MM_TABLES.SERVER;

/**
 * prepareGroupMembershipRecord: Prepares record of entity 'GROUP_MEMBERSHIP' from the SERVER database for update or create actions.
 * @param {DataFactoryArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareGroupMembershipRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawGroupMembership;
    const record = value.record as GroupMembership;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const generator = (groupMember: GroupMembership) => {
        groupMember._raw.id = isCreateAction ? (raw?.id ?? groupMember.id) : record.id;
        groupMember.groupId = raw.group_id;
        groupMember.userId = raw.user_id;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: GROUP_MEMBERSHIP,
        value,
        generator,
    });
};

/**
 * prepareGroupRecord: Prepares record of entity 'GROUP' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareGroupRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawGroup;
    const record = value.record as Group;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const generator = (group: Group) => {
        group._raw.id = isCreateAction ? (raw?.id ?? group.id) : record.id;
        group.name = raw.name;
        group.displayName = raw.display_name;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: GROUP,
        value,
        generator,
    });
};

/**
 * prepareGroupsInTeamRecord: Prepares record of entity 'GROUPS_IN_TEAM' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareGroupsInTeamRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawGroupsInTeam;
    const record = value.record as GroupsInTeam;
    const isCreateAction = action === OperationType.CREATE;

    const generator = (groupsInTeam: GroupsInTeam) => {
        groupsInTeam._raw.id = isCreateAction ? groupsInTeam.id : record.id;
        groupsInTeam.teamId = raw.team_id;
        groupsInTeam.groupId = raw.group_id;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: GROUPS_IN_TEAM,
        value,
        generator,
    });
};

/**
 * prepareGroupsInChannelRecord: Prepares record of entity 'GROUPS_IN_CHANNEL' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareGroupsInChannelRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawGroupsInChannel;
    const record = value.record as GroupsInChannel;
    const isCreateAction = action === OperationType.CREATE;

    const generator = (groupsInChannel: GroupsInChannel) => {
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
        generator,
    });
};

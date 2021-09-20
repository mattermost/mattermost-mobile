// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';
import {OperationType} from '@typings/database/enums';

import type {TransformerArgs} from '@typings/database/database';
import type GroupModel from '@typings/database/models/servers/group';
import type GroupMembershipModel from '@typings/database/models/servers/group_membership';
import type GroupsChannelModel from '@typings/database/models/servers/groups_channel';
import type GroupsTeamModel from '@typings/database/models/servers/groups_team';

const {
    GROUP,
    GROUPS_CHANNEL,
    GROUPS_TEAM,
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
        group.allowReference = raw.allow_reference;
        group.deleteAt = raw.delete_at;
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
 * transformGroupsTeamRecord: Prepares a record of the SERVER database 'GroupsTeam' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<GroupsTeamModel>}
 */
export const transformGroupsTeamRecord = ({action, database, value}: TransformerArgs): Promise<GroupsTeamModel> => {
    const raw = value.raw as GroupTeam;
    const record = value.record as GroupsTeamModel;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (groupsTeam: GroupsTeamModel) => {
        groupsTeam._raw.id = isCreateAction ? groupsTeam.id : record.id;
        groupsTeam.teamId = raw.team_id;
        groupsTeam.groupId = raw.group_id;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: GROUPS_TEAM,
        value,
        fieldsMapper,
    }) as Promise<GroupsTeamModel>;
};

/**
 * transformGroupsChannelRecord: Prepares a record of the SERVER database 'GroupsChannel' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<GroupsChannelModel>}
 */
export const transformGroupsChannelRecord = ({action, database, value}: TransformerArgs): Promise<GroupsChannelModel> => {
    const raw = value.raw as GroupChannelRelation;
    const record = value.record as GroupsChannelModel;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (groupsChannel: GroupsChannelModel) => {
        groupsChannel._raw.id = isCreateAction ? groupsChannel.id : record.id;
        groupsChannel.channelId = raw.channel_id;
        groupsChannel.groupId = raw.group_id;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: GROUPS_CHANNEL,
        value,
        fieldsMapper,
    }) as Promise<GroupsChannelModel>;
};

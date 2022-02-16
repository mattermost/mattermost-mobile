// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
export {};

// groups: MM-41882 import {MM_TABLES} from '@constants/database';
// groups: MM-41882 import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';
// groups: MM-41882 import {OperationType} from '@typings/database/enums';
// groups: MM-41882
// groups: MM-41882 import type {TransformerArgs} from '@typings/database/database';
// groups: MM-41882 import type GroupModel from '@typings/database/models/servers/group';
// groups: MM-41882 import type GroupMembershipModel from '@typings/database/models/servers/group_membership';
// groups: MM-41882 import type GroupsChannelModel from '@typings/database/models/servers/groups_channel';
// groups: MM-41882 import type GroupsTeamModel from '@typings/database/models/servers/groups_team';
// groups: MM-41882
// groups: MM-41882 const {
// groups: MM-41882     GROUP,
// groups: MM-41882     GROUPS_CHANNEL,
// groups: MM-41882     GROUPS_TEAM,
// groups: MM-41882     GROUP_MEMBERSHIP,
// groups: MM-41882 } = MM_TABLES.SERVER;
// groups: MM-41882
// groups: MM-41882 /**
// groups: MM-41882  * transformGroupMembershipRecord: Prepares a record of the SERVER database 'GroupMembership' table for update or create actions.
// groups: MM-41882  * @param {TransformerArgs} operator
// groups: MM-41882  * @param {Database} operator.database
// groups: MM-41882  * @param {RecordPair} operator.value
// groups: MM-41882  * @returns {Promise<GroupMembershipModel>}
// groups: MM-41882  */
// groups: MM-41882 export const transformGroupMembershipRecord = ({action, database, value}: TransformerArgs): Promise<GroupMembershipModel> => {
// groups: MM-41882     const raw = value.raw as GroupMembership;
// groups: MM-41882     const record = value.record as GroupMembershipModel;
// groups: MM-41882     const isCreateAction = action === OperationType.CREATE;
// groups: MM-41882
// groups: MM-41882     // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
// groups: MM-41882     const fieldsMapper = (groupMember: GroupMembershipModel) => {
// groups: MM-41882         groupMember._raw.id = isCreateAction ? (raw?.id ?? groupMember.id) : record.id;
// groups: MM-41882         groupMember.groupId = raw.group_id;
// groups: MM-41882         groupMember.userId = raw.user_id;
// groups: MM-41882     };
// groups: MM-41882
// groups: MM-41882     return prepareBaseRecord({
// groups: MM-41882         action,
// groups: MM-41882         database,
// groups: MM-41882         tableName: GROUP_MEMBERSHIP,
// groups: MM-41882         value,
// groups: MM-41882         fieldsMapper,
// groups: MM-41882     }) as Promise<GroupMembershipModel>;
// groups: MM-41882 };
// groups: MM-41882
// groups: MM-41882 /**
// groups: MM-41882  * transformGroupRecord: Prepares a record of the SERVER database 'Group' table for update or create actions.
// groups: MM-41882  * @param {DataFactory} operator
// groups: MM-41882  * @param {Database} operator.database
// groups: MM-41882  * @param {RecordPair} operator.value
// groups: MM-41882  * @returns {Promise<GroupModel>}
// groups: MM-41882  */
// groups: MM-41882 export const transformGroupRecord = ({action, database, value}: TransformerArgs): Promise<GroupModel> => {
// groups: MM-41882     const raw = value.raw as Group;
// groups: MM-41882     const record = value.record as GroupModel;
// groups: MM-41882     const isCreateAction = action === OperationType.CREATE;
// groups: MM-41882
// groups: MM-41882     // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
// groups: MM-41882     const fieldsMapper = (group: GroupModel) => {
// groups: MM-41882         group._raw.id = isCreateAction ? (raw?.id ?? group.id) : record.id;
// groups: MM-41882         group.allowReference = raw.allow_reference;
// groups: MM-41882         group.deleteAt = raw.delete_at;
// groups: MM-41882         group.name = raw.name;
// groups: MM-41882         group.displayName = raw.display_name;
// groups: MM-41882     };
// groups: MM-41882
// groups: MM-41882     return prepareBaseRecord({
// groups: MM-41882         action,
// groups: MM-41882         database,
// groups: MM-41882         tableName: GROUP,
// groups: MM-41882         value,
// groups: MM-41882         fieldsMapper,
// groups: MM-41882     }) as Promise<GroupModel>;
// groups: MM-41882 };
// groups: MM-41882
// groups: MM-41882 /**
// groups: MM-41882  * transformGroupsTeamRecord: Prepares a record of the SERVER database 'GroupsTeam' table for update or create actions.
// groups: MM-41882  * @param {DataFactory} operator
// groups: MM-41882  * @param {Database} operator.database
// groups: MM-41882  * @param {RecordPair} operator.value
// groups: MM-41882  * @returns {Promise<GroupsTeamModel>}
// groups: MM-41882  */
// groups: MM-41882 export const transformGroupsTeamRecord = ({action, database, value}: TransformerArgs): Promise<GroupsTeamModel> => {
// groups: MM-41882     const raw = value.raw as GroupTeam;
// groups: MM-41882     const record = value.record as GroupsTeamModel;
// groups: MM-41882     const isCreateAction = action === OperationType.CREATE;
// groups: MM-41882
// groups: MM-41882     const fieldsMapper = (groupsTeam: GroupsTeamModel) => {
// groups: MM-41882         groupsTeam._raw.id = isCreateAction ? groupsTeam.id : record.id;
// groups: MM-41882         groupsTeam.teamId = raw.team_id;
// groups: MM-41882         groupsTeam.groupId = raw.group_id;
// groups: MM-41882     };
// groups: MM-41882
// groups: MM-41882     return prepareBaseRecord({
// groups: MM-41882         action,
// groups: MM-41882         database,
// groups: MM-41882         tableName: GROUPS_TEAM,
// groups: MM-41882         value,
// groups: MM-41882         fieldsMapper,
// groups: MM-41882     }) as Promise<GroupsTeamModel>;
// groups: MM-41882 };
// groups: MM-41882
// groups: MM-41882 /**
// groups: MM-41882  * transformGroupsChannelRecord: Prepares a record of the SERVER database 'GroupsChannel' table for update or create actions.
// groups: MM-41882  * @param {DataFactory} operator
// groups: MM-41882  * @param {Database} operator.database
// groups: MM-41882  * @param {RecordPair} operator.value
// groups: MM-41882  * @returns {Promise<GroupsChannelModel>}
// groups: MM-41882  */
// groups: MM-41882 export const transformGroupsChannelRecord = ({action, database, value}: TransformerArgs): Promise<GroupsChannelModel> => {
// groups: MM-41882     const raw = value.raw as GroupChannelRelation;
// groups: MM-41882     const record = value.record as GroupsChannelModel;
// groups: MM-41882     const isCreateAction = action === OperationType.CREATE;
// groups: MM-41882
// groups: MM-41882     const fieldsMapper = (groupsChannel: GroupsChannelModel) => {
// groups: MM-41882         groupsChannel._raw.id = isCreateAction ? groupsChannel.id : record.id;
// groups: MM-41882         groupsChannel.channelId = raw.channel_id;
// groups: MM-41882         groupsChannel.groupId = raw.group_id;
// groups: MM-41882     };
// groups: MM-41882
// groups: MM-41882     return prepareBaseRecord({
// groups: MM-41882         action,
// groups: MM-41882         database,
// groups: MM-41882         tableName: GROUPS_CHANNEL,
// groups: MM-41882         value,
// groups: MM-41882         fieldsMapper,
// groups: MM-41882     }) as Promise<GroupsChannelModel>;
// groups: MM-41882 };

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
export {};

// groups: MM-41882 import {MM_TABLES} from '@constants/database';
// groups: MM-41882 import DataOperatorException from '@database/exceptions/data_operator_exception';
// groups: MM-41882 import {
// groups: MM-41882     isRecordGroupEqualToRaw,
// groups: MM-41882     isRecordGroupMembershipEqualToRaw,
// groups: MM-41882     isRecordGroupsChannelEqualToRaw,
// groups: MM-41882     isRecordGroupsTeamEqualToRaw,
// groups: MM-41882 } from '@database/operator/server_data_operator/comparators';
// groups: MM-41882 import {
// groups: MM-41882     transformGroupMembershipRecord,
// groups: MM-41882     transformGroupRecord,
// groups: MM-41882     transformGroupsChannelRecord,
// groups: MM-41882     transformGroupsTeamRecord,
// groups: MM-41882 } from '@database/operator/server_data_operator/transformers/group';
// groups: MM-41882 import {getUniqueRawsBy} from '@database/operator/utils/general';
// groups: MM-41882
// groups: MM-41882 import type {HandleGroupArgs, HandleGroupMembershipArgs, HandleGroupsChannelArgs, HandleGroupsTeamArgs} from '@typings/database/database';
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
// groups: MM-41882 export interface GroupHandlerMix {
// groups: MM-41882     handleGroupMembership: ({groupMemberships, prepareRecordsOnly}: HandleGroupMembershipArgs) => Promise<GroupMembershipModel[]>;
// groups: MM-41882     handleGroup: ({groups, prepareRecordsOnly}: HandleGroupArgs) => Promise<GroupModel[]>;
// groups: MM-41882     handleGroupsTeam: ({groupsTeams, prepareRecordsOnly}: HandleGroupsTeamArgs) => Promise<GroupsTeamModel[]>;
// groups: MM-41882     handleGroupsChannel: ({groupsChannels, prepareRecordsOnly}: HandleGroupsChannelArgs) => Promise<GroupsChannelModel[]>;
// groups: MM-41882 }
// groups: MM-41882
// groups: MM-41882 const GroupHandler = (superclass: any) => class extends superclass {
// groups: MM-41882     /**
// groups: MM-41882      * handleGroupMembership: Handler responsible for the Create/Update operations occurring on the GROUP_MEMBERSHIP table from the 'Server' schema
// groups: MM-41882      * @param {HandleGroupMembershipArgs} groupMembershipsArgs
// groups: MM-41882      * @param {RawGroupMembership[]} groupMembershipsArgs.groupMemberships
// groups: MM-41882      * @param {boolean} groupMembershipsArgs.prepareRecordsOnly
// groups: MM-41882      * @throws DataOperatorException
// groups: MM-41882      * @returns {Promise<GroupMembershipModel[]>}
// groups: MM-41882      */
// groups: MM-41882     handleGroupMembership = ({groupMemberships, prepareRecordsOnly = true}: HandleGroupMembershipArgs): Promise<GroupMembershipModel[]> => {
// groups: MM-41882         if (!groupMemberships.length) {
// groups: MM-41882             throw new DataOperatorException(
// groups: MM-41882                 'An empty "groupMemberships" array has been passed to the handleGroupMembership method',
// groups: MM-41882             );
// groups: MM-41882         }
// groups: MM-41882
// groups: MM-41882         const createOrUpdateRawValues = getUniqueRawsBy({raws: groupMemberships, key: 'group_id'});
// groups: MM-41882
// groups: MM-41882         return this.handleRecords({
// groups: MM-41882             fieldName: 'group_id',
// groups: MM-41882             findMatchingRecordBy: isRecordGroupMembershipEqualToRaw,
// groups: MM-41882             transformer: transformGroupMembershipRecord,
// groups: MM-41882             prepareRecordsOnly,
// groups: MM-41882             createOrUpdateRawValues,
// groups: MM-41882             tableName: GROUP_MEMBERSHIP,
// groups: MM-41882         });
// groups: MM-41882     };
// groups: MM-41882
// groups: MM-41882     /**
// groups: MM-41882      * handleGroup: Handler responsible for the Create/Update operations occurring on the GROUP table from the 'Server' schema
// groups: MM-41882      * @param {HandleGroupArgs} groupsArgs
// groups: MM-41882      * @param {RawGroup[]} groupsArgs.groups
// groups: MM-41882      * @param {boolean} groupsArgs.prepareRecordsOnly
// groups: MM-41882      * @throws DataOperatorException
// groups: MM-41882      * @returns {Promise<GroupModel[]>}
// groups: MM-41882      */
// groups: MM-41882     handleGroup = ({groups, prepareRecordsOnly = true}: HandleGroupArgs): Promise<GroupModel[]> => {
// groups: MM-41882         if (!groups.length) {
// groups: MM-41882             throw new DataOperatorException(
// groups: MM-41882                 'An empty "groups" array has been passed to the handleGroup method',
// groups: MM-41882             );
// groups: MM-41882         }
// groups: MM-41882
// groups: MM-41882         const createOrUpdateRawValues = getUniqueRawsBy({raws: groups, key: 'id'});
// groups: MM-41882
// groups: MM-41882         return this.handleRecords({
// groups: MM-41882             fieldName: 'id',
// groups: MM-41882             findMatchingRecordBy: isRecordGroupEqualToRaw,
// groups: MM-41882             transformer: transformGroupRecord,
// groups: MM-41882             prepareRecordsOnly,
// groups: MM-41882             createOrUpdateRawValues,
// groups: MM-41882             tableName: GROUP,
// groups: MM-41882         });
// groups: MM-41882     };
// groups: MM-41882
// groups: MM-41882     /**
// groups: MM-41882      * handleGroupsTeam: Handler responsible for the Create/Update operations occurring on the GROUPS_TEAM table from the 'Server' schema
// groups: MM-41882      * @param {HandleGroupsTeamArgs} groupsTeamsArgs
// groups: MM-41882      * @param {GroupsTeam[]} groupsTeamsArgs.groupsTeams
// groups: MM-41882      * @param {boolean} groupsTeamsArgs.prepareRecordsOnly
// groups: MM-41882      * @throws DataOperatorException
// groups: MM-41882      * @returns {Promise<GroupsTeamModel[]>}
// groups: MM-41882      */
// groups: MM-41882     handleGroupsTeam = ({groupsTeams, prepareRecordsOnly = true}: HandleGroupsTeamArgs): Promise<GroupsTeamModel[]> => {
// groups: MM-41882         if (!groupsTeams.length) {
// groups: MM-41882             throw new DataOperatorException(
// groups: MM-41882                 'An empty "groups" array has been passed to the handleGroupsTeam method',
// groups: MM-41882             );
// groups: MM-41882         }
// groups: MM-41882
// groups: MM-41882         const createOrUpdateRawValues = groupsTeams.filter((gt, index, self) => (
// groups: MM-41882             index === self.findIndex((item) => item.team_id === gt.team_id && item.group_id === gt.group_id)));
// groups: MM-41882
// groups: MM-41882         return this.handleRecords({
// groups: MM-41882             fieldName: 'group_id',
// groups: MM-41882             findMatchingRecordBy: isRecordGroupsTeamEqualToRaw,
// groups: MM-41882             transformer: transformGroupsTeamRecord,
// groups: MM-41882             prepareRecordsOnly,
// groups: MM-41882             createOrUpdateRawValues,
// groups: MM-41882             tableName: GROUPS_TEAM,
// groups: MM-41882         });
// groups: MM-41882     };
// groups: MM-41882
// groups: MM-41882     /**
// groups: MM-41882      * handleGroupsChannel: Handler responsible for the Create/Update operations occurring on the GROUPS_CHANNEL table from the 'Server' schema
// groups: MM-41882      * @param {HandleGroupsChannelArgs} groupsChannelsArgs
// groups: MM-41882      * @param {GroupsChannel[]} groupsChannelsArgs.groupsChannels
// groups: MM-41882      * @param {boolean} groupsChannelsArgs.prepareRecordsOnly
// groups: MM-41882      * @throws DataOperatorException
// groups: MM-41882      * @returns {Promise<GroupsChannelModel[]>}
// groups: MM-41882      */
// groups: MM-41882     handleGroupsChannel = ({groupsChannels, prepareRecordsOnly = true}: HandleGroupsChannelArgs): Promise<GroupsChannelModel[]> => {
// groups: MM-41882         if (!groupsChannels.length) {
// groups: MM-41882             throw new DataOperatorException(
// groups: MM-41882                 'An empty "groups" array has been passed to the handleGroupsTeam method',
// groups: MM-41882             );
// groups: MM-41882         }
// groups: MM-41882
// groups: MM-41882         const createOrUpdateRawValues = groupsChannels.filter((gc, index, self) => (
// groups: MM-41882             index === self.findIndex((item) => item.channel_id === gc.channel_id && item.group_id === gc.group_id)));
// groups: MM-41882
// groups: MM-41882         return this.handleRecords({
// groups: MM-41882             fieldName: 'group_id',
// groups: MM-41882             findMatchingRecordBy: isRecordGroupsChannelEqualToRaw,
// groups: MM-41882             transformer: transformGroupsChannelRecord,
// groups: MM-41882             prepareRecordsOnly,
// groups: MM-41882             createOrUpdateRawValues,
// groups: MM-41882             tableName: GROUPS_CHANNEL,
// groups: MM-41882         });
// groups: MM-41882     };
// groups: MM-41882 };
// groups: MM-41882
// groups: MM-41882 export default GroupHandler;

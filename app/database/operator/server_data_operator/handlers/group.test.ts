// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
export {};
test.skip('skip', () => undefined);

// groups: MM-41882 import DatabaseManager from '@database/manager';
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
// groups: MM-41882
// groups: MM-41882 import ServerDataOperator from '..';
// groups: MM-41882
// groups: MM-41882 describe('*** Operator: Group Handlers tests ***', () => {
// groups: MM-41882     let operator: ServerDataOperator;
// groups: MM-41882     beforeAll(async () => {
// groups: MM-41882         await DatabaseManager.init(['baseHandler.test.com']);
// groups: MM-41882         operator = DatabaseManager.serverDatabases['baseHandler.test.com'].operator;
// groups: MM-41882     });
// groups: MM-41882
// groups: MM-41882     it('=> HandleGroup: should write to the GROUP table', async () => {
// groups: MM-41882         expect.assertions(2);
// groups: MM-41882
// groups: MM-41882         const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
// groups: MM-41882         const groups: Group[] = [
// groups: MM-41882             {
// groups: MM-41882                 id: 'id_groupdfjdlfkjdkfdsf',
// groups: MM-41882                 name: 'mobile_team',
// groups: MM-41882                 display_name: 'mobile team',
// groups: MM-41882                 description: '',
// groups: MM-41882                 remote_id: '',
// groups: MM-41882                 create_at: 0,
// groups: MM-41882                 update_at: 0,
// groups: MM-41882                 delete_at: 0,
// groups: MM-41882                 has_syncables: true,
// groups: MM-41882                 type: '',
// groups: MM-41882                 member_count: 1,
// groups: MM-41882                 allow_reference: true,
// groups: MM-41882             },
// groups: MM-41882         ];
// groups: MM-41882
// groups: MM-41882         await operator.handleGroup({
// groups: MM-41882             groups,
// groups: MM-41882             prepareRecordsOnly: false,
// groups: MM-41882         });
// groups: MM-41882
// groups: MM-41882         expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
// groups: MM-41882         expect(spyOnHandleRecords).toHaveBeenCalledWith({
// groups: MM-41882             fieldName: 'id',
// groups: MM-41882             createOrUpdateRawValues: groups,
// groups: MM-41882             tableName: 'Group',
// groups: MM-41882             prepareRecordsOnly: false,
// groups: MM-41882             findMatchingRecordBy: isRecordGroupEqualToRaw,
// groups: MM-41882             transformer: transformGroupRecord,
// groups: MM-41882         });
// groups: MM-41882     });
// groups: MM-41882
// groups: MM-41882     it('=> HandleGroupsTeam: should write to the GROUPS_TEAM table', async () => {
// groups: MM-41882         expect.assertions(2);
// groups: MM-41882
// groups: MM-41882         const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
// groups: MM-41882         const groupsTeams = [
// groups: MM-41882             {
// groups: MM-41882                 team_id: 'team_899',
// groups: MM-41882                 team_display_name: '',
// groups: MM-41882                 team_type: '',
// groups: MM-41882                 group_id: 'group_id89',
// groups: MM-41882                 auto_add: true,
// groups: MM-41882                 create_at: 0,
// groups: MM-41882                 delete_at: 0,
// groups: MM-41882                 update_at: 0,
// groups: MM-41882             },
// groups: MM-41882         ];
// groups: MM-41882
// groups: MM-41882         await operator.handleGroupsTeam({
// groups: MM-41882             groupsTeams,
// groups: MM-41882             prepareRecordsOnly: false,
// groups: MM-41882         });
// groups: MM-41882
// groups: MM-41882         expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
// groups: MM-41882         expect(spyOnHandleRecords).toHaveBeenCalledWith({
// groups: MM-41882             fieldName: 'group_id',
// groups: MM-41882             createOrUpdateRawValues: groupsTeams,
// groups: MM-41882             tableName: 'GroupsTeam',
// groups: MM-41882             prepareRecordsOnly: false,
// groups: MM-41882             findMatchingRecordBy: isRecordGroupsTeamEqualToRaw,
// groups: MM-41882             transformer: transformGroupsTeamRecord,
// groups: MM-41882         });
// groups: MM-41882     });
// groups: MM-41882
// groups: MM-41882     it('=> HandleGroupsChannel: should write to the GROUPS_CHANNEL table', async () => {
// groups: MM-41882         expect.assertions(2);
// groups: MM-41882
// groups: MM-41882         const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
// groups: MM-41882         const groupsChannels = [
// groups: MM-41882             {
// groups: MM-41882                 auto_add: true,
// groups: MM-41882                 channel_display_name: '',
// groups: MM-41882                 channel_id: 'channelid',
// groups: MM-41882                 channel_type: '',
// groups: MM-41882                 create_at: 0,
// groups: MM-41882                 delete_at: 0,
// groups: MM-41882                 group_id: 'groupId',
// groups: MM-41882                 team_display_name: '',
// groups: MM-41882                 team_id: '',
// groups: MM-41882                 team_type: '',
// groups: MM-41882                 update_at: 0,
// groups: MM-41882             },
// groups: MM-41882         ];
// groups: MM-41882
// groups: MM-41882         await operator.handleGroupsChannel({
// groups: MM-41882             groupsChannels,
// groups: MM-41882             prepareRecordsOnly: false,
// groups: MM-41882         });
// groups: MM-41882
// groups: MM-41882         expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
// groups: MM-41882         expect(spyOnHandleRecords).toHaveBeenCalledWith({
// groups: MM-41882             fieldName: 'group_id',
// groups: MM-41882             createOrUpdateRawValues: groupsChannels,
// groups: MM-41882             tableName: 'GroupsChannel',
// groups: MM-41882             prepareRecordsOnly: false,
// groups: MM-41882             findMatchingRecordBy: isRecordGroupsChannelEqualToRaw,
// groups: MM-41882             transformer: transformGroupsChannelRecord,
// groups: MM-41882         });
// groups: MM-41882     });
// groups: MM-41882
// groups: MM-41882     it('=> HandleGroupMembership: should write to the GROUP_MEMBERSHIP table', async () => {
// groups: MM-41882         expect.assertions(2);
// groups: MM-41882
// groups: MM-41882         const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
// groups: MM-41882         const groupMemberships = [
// groups: MM-41882             {
// groups: MM-41882                 user_id: 'u4cprpki7ri81mbx8efixcsb8jo',
// groups: MM-41882                 group_id: 'g4cprpki7ri81mbx8efixcsb8jo',
// groups: MM-41882             },
// groups: MM-41882         ];
// groups: MM-41882
// groups: MM-41882         await operator.handleGroupMembership({
// groups: MM-41882             groupMemberships,
// groups: MM-41882             prepareRecordsOnly: false,
// groups: MM-41882         });
// groups: MM-41882
// groups: MM-41882         expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
// groups: MM-41882         expect(spyOnHandleRecords).toHaveBeenCalledWith({
// groups: MM-41882             fieldName: 'group_id',
// groups: MM-41882             createOrUpdateRawValues: groupMemberships,
// groups: MM-41882             tableName: 'GroupMembership',
// groups: MM-41882             prepareRecordsOnly: false,
// groups: MM-41882             findMatchingRecordBy: isRecordGroupMembershipEqualToRaw,
// groups: MM-41882             transformer: transformGroupMembershipRecord,
// groups: MM-41882         });
// groups: MM-41882     });
// groups: MM-41882 });

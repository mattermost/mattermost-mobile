// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
export {};
test.skip('skip', () => undefined);

// groups: MM-41882 import {
// groups: MM-41882     transformGroupMembershipRecord,
// groups: MM-41882     transformGroupRecord,
// groups: MM-41882     transformGroupsChannelRecord,
// groups: MM-41882     transformGroupsTeamRecord,
// groups: MM-41882 } from '@database/operator/server_data_operator/transformers/group';
// groups: MM-41882 import {createTestConnection} from '@database/operator/utils/create_test_connection';
// groups: MM-41882 import {OperationType} from '@typings/database/enums';
// groups: MM-41882
// groups: MM-41882 describe('*** GROUP Prepare Records Test ***', () => {
// groups: MM-41882     it('=> transformGroupRecord: should return an array of type Group', async () => {
// groups: MM-41882         expect.assertions(3);
// groups: MM-41882
// groups: MM-41882         const database = await createTestConnection({databaseName: 'group_prepare_records', setActive: true});
// groups: MM-41882         expect(database).toBeTruthy();
// groups: MM-41882
// groups: MM-41882         const preparedRecords = await transformGroupRecord({
// groups: MM-41882             action: OperationType.CREATE,
// groups: MM-41882             database: database!,
// groups: MM-41882             value: {
// groups: MM-41882                 record: undefined,
// groups: MM-41882                 raw: {
// groups: MM-41882                     id: 'id_groupdfjdlfkjdkfdsf',
// groups: MM-41882                     name: 'mobile_team',
// groups: MM-41882                     display_name: 'mobile team',
// groups: MM-41882                     description: '',
// groups: MM-41882                     type: '',
// groups: MM-41882                     remote_id: '',
// groups: MM-41882                     create_at: 0,
// groups: MM-41882                     update_at: 0,
// groups: MM-41882                     delete_at: 0,
// groups: MM-41882                     has_syncables: true,
// groups: MM-41882                     member_count: 0,
// groups: MM-41882                     allow_reference: false,
// groups: MM-41882                 },
// groups: MM-41882             },
// groups: MM-41882         });
// groups: MM-41882
// groups: MM-41882         expect(preparedRecords).toBeTruthy();
// groups: MM-41882         expect(preparedRecords!.collection.modelClass.name).toBe('GroupModel');
// groups: MM-41882     });
// groups: MM-41882
// groups: MM-41882     it('=> transformGroupsTeamRecord: should return an array of type GroupsTeam', async () => {
// groups: MM-41882         expect.assertions(3);
// groups: MM-41882
// groups: MM-41882         const database = await createTestConnection({databaseName: 'group_prepare_records', setActive: true});
// groups: MM-41882         expect(database).toBeTruthy();
// groups: MM-41882
// groups: MM-41882         const preparedRecords = await transformGroupsTeamRecord({
// groups: MM-41882             action: OperationType.CREATE,
// groups: MM-41882             database: database!,
// groups: MM-41882             value: {
// groups: MM-41882                 record: undefined,
// groups: MM-41882                 raw: {
// groups: MM-41882                     team_id: 'team_89',
// groups: MM-41882                     team_display_name: '',
// groups: MM-41882                     team_type: '',
// groups: MM-41882                     group_id: 'group_id89',
// groups: MM-41882                     auto_add: true,
// groups: MM-41882                     create_at: 0,
// groups: MM-41882                     delete_at: 0,
// groups: MM-41882                     update_at: 0,
// groups: MM-41882                 },
// groups: MM-41882             },
// groups: MM-41882         });
// groups: MM-41882
// groups: MM-41882         expect(preparedRecords).toBeTruthy();
// groups: MM-41882         expect(preparedRecords!.collection.modelClass.name).toBe('GroupsTeamModel');
// groups: MM-41882     });
// groups: MM-41882
// groups: MM-41882     it('=> transformGroupsChannelRecord: should return an array of type GroupsChannel', async () => {
// groups: MM-41882         expect.assertions(3);
// groups: MM-41882
// groups: MM-41882         const database = await createTestConnection({databaseName: 'group_prepare_records', setActive: true});
// groups: MM-41882         expect(database).toBeTruthy();
// groups: MM-41882
// groups: MM-41882         const preparedRecords = await transformGroupsChannelRecord({
// groups: MM-41882             action: OperationType.CREATE,
// groups: MM-41882             database: database!,
// groups: MM-41882             value: {
// groups: MM-41882                 record: undefined,
// groups: MM-41882                 raw: {
// groups: MM-41882                     auto_add: true,
// groups: MM-41882                     channel_display_name: '',
// groups: MM-41882                     channel_id: 'channelid',
// groups: MM-41882                     channel_type: '',
// groups: MM-41882                     create_at: 0,
// groups: MM-41882                     delete_at: 0,
// groups: MM-41882                     group_id: 'groupId',
// groups: MM-41882                     team_display_name: '',
// groups: MM-41882                     team_id: '',
// groups: MM-41882                     team_type: '',
// groups: MM-41882                     update_at: 0,
// groups: MM-41882                 },
// groups: MM-41882             },
// groups: MM-41882         });
// groups: MM-41882
// groups: MM-41882         expect(preparedRecords).toBeTruthy();
// groups: MM-41882         expect(preparedRecords!.collection.modelClass.name).toBe('GroupsChannelModel');
// groups: MM-41882     });
// groups: MM-41882
// groups: MM-41882     it('=> transformGroupMembershipRecord: should return an array of type GroupMembership', async () => {
// groups: MM-41882         expect.assertions(3);
// groups: MM-41882
// groups: MM-41882         const database = await createTestConnection({databaseName: 'group_prepare_records', setActive: true});
// groups: MM-41882         expect(database).toBeTruthy();
// groups: MM-41882
// groups: MM-41882         const preparedRecords = await transformGroupMembershipRecord({
// groups: MM-41882             action: OperationType.CREATE,
// groups: MM-41882             database: database!,
// groups: MM-41882             value: {
// groups: MM-41882                 record: undefined,
// groups: MM-41882                 raw: {
// groups: MM-41882                     user_id: 'u4cprpki7ri81mbx8efixcsb8jo',
// groups: MM-41882                     group_id: 'g4cprpki7ri81mbx8efixcsb8jo',
// groups: MM-41882                 },
// groups: MM-41882             },
// groups: MM-41882         });
// groups: MM-41882
// groups: MM-41882         expect(preparedRecords).toBeTruthy();
// groups: MM-41882         expect(preparedRecords!.collection.modelClass.name).toBe('GroupMembershipModel');
// groups: MM-41882     });
// groups: MM-41882 });

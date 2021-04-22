// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DataOperator} from '@database/operator';
import {
    isRecordGroupEqualToRaw,
    isRecordGroupMembershipEqualToRaw,
    isRecordGroupsInChannelEqualToRaw,
    isRecordGroupsInTeamEqualToRaw,
} from '@database/operator/comparators';
import {
    prepareGroupMembershipRecord,
    prepareGroupRecord,
    prepareGroupsInChannelRecord,
    prepareGroupsInTeamRecord,
} from '@database/operator/prepareRecords/group';
import {createTestConnection} from '@database/operator/utils/create_test_connection';

jest.mock('@database/manager');

/* eslint-disable  @typescript-eslint/no-explicit-any */

describe('*** Operator: Group Handlers tests ***', () => {
    it('=> HandleGroup: should write to GROUP entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(DataOperator as any, 'handleEntityRecords');

        await createTestConnection({databaseName: 'group_handler', setActive: true});

        await DataOperator.handleGroup({
            groups: [
                {
                    id: 'id_groupdfjdlfkjdkfdsf',
                    name: 'mobile_team',
                    display_name: 'mobile team',
                    description: '',
                    source: '',
                    remote_id: '',
                    create_at: 0,
                    update_at: 0,
                    delete_at: 0,
                    has_syncables: true,
                },
            ],
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'name',
            rawValues: [
                {
                    id: 'id_groupdfjdlfkjdkfdsf',
                    name: 'mobile_team',
                    display_name: 'mobile team',
                    description: '',
                    source: '',
                    remote_id: '',
                    create_at: 0,
                    update_at: 0,
                    delete_at: 0,
                    has_syncables: true,
                },
            ],
            tableName: 'Group',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordGroupEqualToRaw,
            operator: prepareGroupRecord,
        });
    });

    it('=> HandleGroupsInTeam: should write to GROUPS_IN_TEAM entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(DataOperator as any, 'handleEntityRecords');

        await createTestConnection({databaseName: 'group_handler', setActive: true});

        await DataOperator.handleGroupsInTeam({
            groupsInTeams: [
                {
                    team_id: 'team_899',
                    team_display_name: '',
                    team_type: '',
                    group_id: 'group_id89',
                    auto_add: true,
                    create_at: 0,
                    delete_at: 0,
                    update_at: 0,
                },
            ],
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'group_id',
            rawValues: [
                {
                    team_id: 'team_899',
                    team_display_name: '',
                    team_type: '',
                    group_id: 'group_id89',
                    auto_add: true,
                    create_at: 0,
                    delete_at: 0,
                    update_at: 0,
                },
            ],
            tableName: 'GroupsInTeam',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordGroupsInTeamEqualToRaw,
            operator: prepareGroupsInTeamRecord,
        });
    });

    it('=> HandleGroupsInChannel: should write to GROUPS_IN_CHANNEL entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(DataOperator as any, 'handleEntityRecords');

        await createTestConnection({databaseName: 'group_handler', setActive: true});

        await DataOperator.handleGroupsInChannel({
            groupsInChannels: [
                {
                    auto_add: true,
                    channel_display_name: '',
                    channel_id: 'channelid',
                    channel_type: '',
                    create_at: 0,
                    delete_at: 0,
                    group_id: 'groupId',
                    team_display_name: '',
                    team_id: '',
                    team_type: '',
                    update_at: 0,
                    member_count: 0,
                    timezone_count: 0,
                },
            ],
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'group_id',
            rawValues: [
                {
                    auto_add: true,
                    channel_display_name: '',
                    channel_id: 'channelid',
                    channel_type: '',
                    create_at: 0,
                    delete_at: 0,
                    group_id: 'groupId',
                    team_display_name: '',
                    team_id: '',
                    team_type: '',
                    update_at: 0,
                    member_count: 0,
                    timezone_count: 0,
                },
            ],
            tableName: 'GroupsInChannel',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordGroupsInChannelEqualToRaw,
            operator: prepareGroupsInChannelRecord,
        });
    });

    it('=> HandleGroupMembership: should write to GROUP_MEMBERSHIP entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(DataOperator as any, 'handleEntityRecords');

        await createTestConnection({databaseName: 'group_handler', setActive: true});

        await DataOperator.handleGroupMembership({
            groupMemberships: [
                {
                    user_id: 'u4cprpki7ri81mbx8efixcsb8jo',
                    group_id: 'g4cprpki7ri81mbx8efixcsb8jo',
                },
            ],
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'user_id',
            rawValues: [
                {
                    user_id: 'u4cprpki7ri81mbx8efixcsb8jo',
                    group_id: 'g4cprpki7ri81mbx8efixcsb8jo',
                },
            ],
            tableName: 'GroupMembership',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordGroupMembershipEqualToRaw,
            operator: prepareGroupMembershipRecord,
        });
    });
});

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {
    isRecordGroupEqualToRaw,
    isRecordGroupMembershipEqualToRaw,
    isRecordGroupsChannelEqualToRaw,
    isRecordGroupsTeamEqualToRaw,
} from '@database/operator/server_data_operator/comparators';
import {
    transformGroupMembershipRecord,
    transformGroupRecord,
    transformGroupsChannelRecord,
    transformGroupsTeamRecord,
} from '@database/operator/server_data_operator/transformers/group';

import ServerDataOperator from '..';

describe('*** Operator: Group Handlers tests ***', () => {
    let operator: ServerDataOperator;
    beforeAll(async () => {
        await DatabaseManager.init(['baseHandler.test.com']);
        operator = DatabaseManager.serverDatabases['baseHandler.test.com'].operator;
    });

    it('=> HandleGroup: should write to the GROUP table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const groups: Group[] = [
            {
                id: 'id_groupdfjdlfkjdkfdsf',
                name: 'mobile_team',
                display_name: 'mobile team',
                description: '',
                remote_id: '',
                create_at: 0,
                update_at: 0,
                delete_at: 0,
                has_syncables: true,
                type: '',
                member_count: 1,
                allow_reference: true,
            },
        ];

        await operator.handleGroup({
            groups,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            createOrUpdateRawValues: groups,
            tableName: 'Group',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordGroupEqualToRaw,
            transformer: transformGroupRecord,
        });
    });

    it('=> HandleGroupsTeam: should write to the GROUPS_TEAM table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const groupsTeams = [
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
        ];

        await operator.handleGroupsTeam({
            groupsTeams,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'group_id',
            createOrUpdateRawValues: groupsTeams,
            tableName: 'GroupsTeam',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordGroupsTeamEqualToRaw,
            transformer: transformGroupsTeamRecord,
        });
    });

    it('=> HandleGroupsChannel: should write to the GROUPS_CHANNEL table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const groupsChannels = [
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
            },
        ];

        await operator.handleGroupsChannel({
            groupsChannels,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'group_id',
            createOrUpdateRawValues: groupsChannels,
            tableName: 'GroupsChannel',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordGroupsChannelEqualToRaw,
            transformer: transformGroupsChannelRecord,
        });
    });

    it('=> HandleGroupMembership: should write to the GROUP_MEMBERSHIP table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const groupMemberships = [
            {
                user_id: 'u4cprpki7ri81mbx8efixcsb8jo',
                group_id: 'g4cprpki7ri81mbx8efixcsb8jo',
            },
        ];

        await operator.handleGroupMembership({
            groupMemberships,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'group_id',
            createOrUpdateRawValues: groupMemberships,
            tableName: 'GroupMembership',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordGroupMembershipEqualToRaw,
            transformer: transformGroupMembershipRecord,
        });
    });
});

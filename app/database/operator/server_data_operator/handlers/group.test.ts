// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {
    isRecordGroupEqualToRaw,
    isRecordGroupMembershipEqualToRaw,
    isRecordGroupsInChannelEqualToRaw,
    isRecordGroupsInTeamEqualToRaw,
} from '@database/operator/server_data_operator/comparators';
import {
    transformGroupMembershipRecord,
    transformGroupRecord,
    transformGroupsInChannelRecord,
    transformGroupsInTeamRecord,
} from '@database/operator/server_data_operator/transformers/group';

import ServerDataOperator from '..';

describe('*** Operator: Group Handlers tests ***', () => {
    let operator: ServerDataOperator;
    beforeAll(async () => {
        await DatabaseManager.init(['baseHandler.test.com']);
        operator = DatabaseManager.serverDatabases['baseHandler.test.com'].operator;
    });

    it('=> HandleGroup: should write to GROUP entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(operator, 'handleEntityRecords');
        const groups = [
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
        ];

        await operator.handleGroup({
            groups,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'name',
            createOrUpdateRawValues: groups,
            tableName: 'Group',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordGroupEqualToRaw,
            transformer: transformGroupRecord,
        });
    });

    it('=> HandleGroupsInTeam: should write to GROUPS_IN_TEAM entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(operator, 'handleEntityRecords');
        const groupsInTeams = [
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

        await operator.handleGroupsInTeam({
            groupsInTeams,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'group_id',
            createOrUpdateRawValues: groupsInTeams,
            tableName: 'GroupsInTeam',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordGroupsInTeamEqualToRaw,
            transformer: transformGroupsInTeamRecord,
        });
    });

    it('=> HandleGroupsInChannel: should write to GROUPS_IN_CHANNEL entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(operator, 'handleEntityRecords');
        const groupsInChannels = [
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
        ];

        await operator.handleGroupsInChannel({
            groupsInChannels,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'group_id',
            createOrUpdateRawValues: groupsInChannels,
            tableName: 'GroupsInChannel',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordGroupsInChannelEqualToRaw,
            transformer: transformGroupsInChannelRecord,
        });
    });

    it('=> HandleGroupMembership: should write to GROUP_MEMBERSHIP entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(operator, 'handleEntityRecords');
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

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'user_id',
            createOrUpdateRawValues: groupMemberships,
            tableName: 'GroupMembership',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordGroupMembershipEqualToRaw,
            transformer: transformGroupMembershipRecord,
        });
    });
});

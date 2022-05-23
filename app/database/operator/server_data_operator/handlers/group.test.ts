// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {
    transformGroupRecord,
    transformGroupChannelRecord,
} from '@database/operator/server_data_operator/transformers/group';

import ServerDataOperator from '..';

describe('*** Operator: Group Handlers tests ***', () => {
    let operator: ServerDataOperator;
    beforeAll(async () => {
        await DatabaseManager.init(['baseHandler.test.com']);
        operator = DatabaseManager.serverDatabases['baseHandler.test.com'].operator;
    });

    it('=> handleGroups: should write to the GROUP table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const groups: Group[] = [
            {
                id: 'kjlw9j1ttnxwig7tnqgebg7dtipno',
                name: 'test',
                display_name: 'Test',
                source: 'custom',
                remote_id: 'iuh4r89egnslnvakjsdjhg',
                description: 'Test description',
                member_count: 0,
                allow_reference: true,
                create_at: 0,
                update_at: 0,
                delete_at: 0,
            },
        ];

        await operator.handleGroups({
            groups,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            createOrUpdateRawValues: groups,
            tableName: MM_TABLES.SERVER.GROUP,
            prepareRecordsOnly: false,
            transformer: transformGroupRecord,
        });
    });

    it('=> handleGroupChannels: should write to the GROUP_CHANNEL table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const groupChannels: GroupChannel[] = [
            {
                group_id: 'kjlw9j1ttnxwig7tnqgebg7dtipno',
                channel_id: 'channel-id',
                channel_display_name: 'Test Channel',
                channel_type: 'channel',
                team_id: 'hfpqw3489gsjfknads',
                team_display_name: 'Test team',
                team_type: '',
                timezone_count: 0,
                auto_add: false,
                create_at: 0,
                update_at: 0,
                delete_at: 0,
            },
        ];

        await operator.handleGroupChannels({
            groupChannels,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            createOrUpdateRawValues: groupChannels,
            tableName: MM_TABLES.SERVER.GROUP_CHANNEL,
            prepareRecordsOnly: false,
            transformer: transformGroupChannelRecord,
        });
    });
});

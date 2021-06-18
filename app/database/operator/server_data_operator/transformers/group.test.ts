// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    transformGroupMembershipRecord,
    transformGroupRecord,
    transformGroupsInChannelRecord,
    transformGroupsInTeamRecord,
} from '@database/operator/server_data_operator/transformers/group';
import {createTestConnection} from '@database/operator/utils/create_test_connection';
import {OperationType} from '@typings/database/enums';

describe('*** GROUP Prepare Records Test ***', () => {
    it('=> transformGroupRecord: should return an array of type Group', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'group_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await transformGroupRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
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
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('Group');
    });

    it('=> transformGroupsInTeamRecord: should return an array of type GroupsInTeam', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'group_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await transformGroupsInTeamRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    team_id: 'team_89',
                    team_display_name: '',
                    team_type: '',
                    group_id: 'group_id89',
                    auto_add: true,
                    create_at: 0,
                    delete_at: 0,
                    update_at: 0,
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('GroupsInTeam');
    });

    it('=> transformGroupsInChannelRecord: should return an array of type GroupsInChannel', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'group_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await transformGroupsInChannelRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
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
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('GroupsInChannel');
    });

    it('=> transformGroupMembershipRecord: should return an array of type GroupMembership', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'group_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await transformGroupMembershipRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    user_id: 'u4cprpki7ri81mbx8efixcsb8jo',
                    group_id: 'g4cprpki7ri81mbx8efixcsb8jo',
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('GroupMembership');
    });
});

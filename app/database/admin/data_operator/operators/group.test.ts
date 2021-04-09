// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    operateGroupMembershipRecord,
    operateGroupRecord,
    operateGroupsInChannelRecord,
    operateGroupsInTeamRecord,
} from '@database/admin/data_operator/operators/group';
import {createConnection} from '@database/admin/data_operator/operators/utils';
import {OperationType} from '@typings/database/enums';

describe('*** GROUP Prepare Records Test ***', () => {
    it('=> operateGroupRecord: should return an array of type Group', async () => {
        expect.assertions(3);

        const database = await createConnection('group_prepare_records');
        expect(database).toBeTruthy();

        const preparedRecords = await operateGroupRecord({
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

    it('=> operateGroupsInTeamRecord: should return an array of type GroupsInTeam', async () => {
        expect.assertions(3);

        const database = await createConnection('group_prepare_records');
        expect(database).toBeTruthy();

        const preparedRecords = await operateGroupsInTeamRecord({
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

    it('=> operateGroupsInChannelRecord: should return an array of type GroupsInChannel', async () => {
        expect.assertions(3);

        const database = await createConnection('group_prepare_records');
        expect(database).toBeTruthy();

        const preparedRecords = await operateGroupsInChannelRecord({
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

    it('=> operateGroupMembershipRecord: should return an array of type GroupMembership', async () => {
        expect.assertions(3);

        const database = await createConnection('group_prepare_records');
        expect(database).toBeTruthy();

        const preparedRecords = await operateGroupMembershipRecord({
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

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {
    transformGroupRecord,
} from '@database/operator/server_data_operator/transformers/group';
import {queryGroupMembershipForMember} from '@queries/servers/group';
import {generateGroupAssociationId} from '@utils/groups';

import type ServerDataOperator from '..';
import type {Database} from '@nozbe/watermelondb';

const serverUrl = 'baseHandler.test.com';
const userId = 'user1';

describe('*** Operator: Group Handlers tests ***', () => {
    let operator: ServerDataOperator;
    beforeAll(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(() => {
        jest.clearAllMocks();
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
        }, 'handleGroups');
    });

    describe('handleGroupMembershipsDelta', () => {
        let database: Database;

        beforeEach(async () => {
            database = DatabaseManager.serverDatabases[serverUrl]!.database;

            // Seed one existing membership so removal tests have something to act on.
            await operator.handleGroupMembershipsForMember({
                userId,
                groups: [{id: 'group-existing'}],
                prepareRecordsOnly: false,
            });
        });

        afterEach(async () => {
            // Clean up memberships after each test.
            const existing = await queryGroupMembershipForMember(database, userId).fetch();
            if (existing.length) {
                await database.write(async () => {
                    await database.batch(...existing.map((m) => m.prepareDestroyPermanently()));
                });
            }
        });

        it('should add new memberships', async () => {
            await operator.handleGroupMembershipsDelta({
                userId,
                addedGroupIds: ['group-new'],
                removedGroupIds: [],
                prepareRecordsOnly: false,
            });

            const memberships = await queryGroupMembershipForMember(database, userId).fetch();
            const groupIds = memberships.map((m) => m.groupId);
            expect(groupIds).toContain('group-existing');
            expect(groupIds).toContain('group-new');
        });

        it('should remove tombstoned memberships', async () => {
            await operator.handleGroupMembershipsDelta({
                userId,
                addedGroupIds: [],
                removedGroupIds: ['group-existing'],
                prepareRecordsOnly: false,
            });

            const memberships = await queryGroupMembershipForMember(database, userId).fetch();
            expect(memberships.map((m) => m.groupId)).not.toContain('group-existing');
        });

        it('should add and remove in the same call', async () => {
            await operator.handleGroupMembershipsDelta({
                userId,
                addedGroupIds: ['group-added'],
                removedGroupIds: ['group-existing'],
                prepareRecordsOnly: false,
            });

            const memberships = await queryGroupMembershipForMember(database, userId).fetch();
            const groupIds = memberships.map((m) => m.groupId);
            expect(groupIds).toContain('group-added');
            expect(groupIds).not.toContain('group-existing');
        });

        it('should return an empty array when both lists are empty', async () => {
            const records = await operator.handleGroupMembershipsDelta({
                userId,
                addedGroupIds: [],
                removedGroupIds: [],
                prepareRecordsOnly: true,
            });

            expect(records).toHaveLength(0);
        });

        it('should return prepared records without writing when prepareRecordsOnly is true', async () => {
            const spyOnBatch = jest.spyOn(operator, 'batchRecords');

            const records = await operator.handleGroupMembershipsDelta({
                userId,
                addedGroupIds: ['group-prepared'],
                removedGroupIds: [],
                prepareRecordsOnly: true,
            });

            expect(records.length).toBeGreaterThan(0);
            expect(spyOnBatch).not.toHaveBeenCalled();

            // Verify it was not written to DB.
            const memberships = await queryGroupMembershipForMember(database, userId).fetch();
            expect(memberships.map((m) => m.groupId)).not.toContain('group-prepared');
        });

        it('should use generateGroupAssociationId for added membership IDs', async () => {
            await operator.handleGroupMembershipsDelta({
                userId,
                addedGroupIds: ['group-id-check'],
                removedGroupIds: [],
                prepareRecordsOnly: false,
            });

            const memberships = await queryGroupMembershipForMember(database, userId).fetch();
            const added = memberships.find((m) => m.groupId === 'group-id-check');
            expect(added?.id).toBe(generateGroupAssociationId('group-id-check', userId));
        });
    });
});

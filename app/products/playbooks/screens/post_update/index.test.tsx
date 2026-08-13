// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getPlaybookChecklistItemById} from '@playbooks/database/queries/item';
import {act, renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import PostUpdateComponent from './post_update';

import PostUpdate from './';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./post_update');
jest.mocked(PostUpdateComponent).mockImplementation(
    (props) => React.createElement('PostUpdate', {testID: 'post-update', ...props}),
);

const serverUrl = 'server-url';

describe('PostUpdate', () => {
    const playbookRunId = 'run-id';
    const runName = 'Test Run';
    const channelId = 'channel-id';
    const teamId = 'team-id';
    const userId = 'user-id';

    const baseRun = TestHelper.fakePlaybookRun({
        id: playbookRunId,
        name: runName,
        channel_id: channelId,
        checklists: [
            TestHelper.fakePlaybookChecklist(playbookRunId, {
                id: 'checklist-1',
                items: [

                    // Outstanding items (state: '' or 'in_progress')
                    TestHelper.fakePlaybookChecklistItem(playbookRunId, {
                        id: 'item-1',
                        state: '',
                    }),
                    TestHelper.fakePlaybookChecklistItem(playbookRunId, {
                        id: 'item-2',
                        state: 'in_progress',
                    }),

                    // Closed item (not outstanding)
                    TestHelper.fakePlaybookChecklistItem(playbookRunId, {
                        id: 'item-3',
                        state: 'closed',
                    }),
                ],
            }),
            TestHelper.fakePlaybookChecklist(playbookRunId, {
                id: 'checklist-2',
                items: [

                    // Outstanding item
                    TestHelper.fakePlaybookChecklistItem(playbookRunId, {
                        id: 'item-4',
                        state: 'in_progress',
                    }),

                    // Skipped item (not outstanding)
                    TestHelper.fakePlaybookChecklistItem(playbookRunId, {
                        id: 'item-5',
                        state: 'skipped',
                    }),
                ],
            }),
        ],
        items_order: ['checklist-1', 'checklist-2'],
    });

    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(() => {
        DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('with database data', () => {
        function getBaseProps(): ComponentProps<typeof PostUpdate> {
            return {
                playbookRunId,
            };
        }

        it('should render correctly with no data', () => {
            const props = getBaseProps();
            const {getByTestId} = renderWithEverything(<PostUpdate {...props}/>, {database});

            const postUpdate = getByTestId('post-update');
            expect(postUpdate).toHaveProp('runName', '');
            expect(postUpdate).toHaveProp('userId', '');
            expect(postUpdate).toHaveProp('channelId', undefined);
            expect(postUpdate).toHaveProp('teamId', '');
            expect(postUpdate).toHaveProp('outstanding', 0);
        });

        it('should render correctly with playbook run data', async () => {
            await operator.handlePlaybookRun({
                prepareRecordsOnly: false,
                runs: [baseRun],
                processChildren: true,
            });

            await operator.handleSystem({
                systems: [{
                    id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                    value: userId,
                }],
                prepareRecordsOnly: false,
            });

            await operator.handleSystem({
                systems: [{
                    id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID,
                    value: teamId,
                }],
                prepareRecordsOnly: false,
            });

            const props = getBaseProps();
            const {getByTestId} = renderWithEverything(<PostUpdate {...props}/>, {database});

            await waitFor(() => {
                const postUpdate = getByTestId('post-update');
                expect(postUpdate).toHaveProp('runName', runName);
                expect(postUpdate).toHaveProp('userId', userId);
                expect(postUpdate).toHaveProp('channelId', channelId);
                expect(postUpdate).toHaveProp('teamId', teamId);
                expect(postUpdate).toHaveProp('outstanding', 3); // item-1, item-2, item-4 are outstanding
            });
        });

        it('should calculate outstanding count correctly', async () => {
            const runWithMixedStates = TestHelper.fakePlaybookRun({
                id: playbookRunId,
                name: runName,
                channel_id: channelId,
                checklists: [
                    TestHelper.fakePlaybookChecklist(playbookRunId, {
                        id: 'checklist-1',
                        items: [
                            TestHelper.fakePlaybookChecklistItem(playbookRunId, {
                                id: 'item-1',
                                state: '',
                            }),
                            TestHelper.fakePlaybookChecklistItem(playbookRunId, {
                                id: 'item-2',
                                state: 'in_progress',
                            }),
                            TestHelper.fakePlaybookChecklistItem(playbookRunId, {
                                id: 'item-3',
                                state: 'closed',
                            }),
                            TestHelper.fakePlaybookChecklistItem(playbookRunId, {
                                id: 'item-4',
                                state: 'skipped',
                            }),
                        ],
                    }),
                ],
                items_order: ['checklist-1'],
            });

            await operator.handlePlaybookRun({
                prepareRecordsOnly: false,
                runs: [runWithMixedStates],
                processChildren: true,
            });

            await operator.handleSystem({
                systems: [{
                    id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                    value: userId,
                }],
                prepareRecordsOnly: false,
            });

            await operator.handleSystem({
                systems: [{
                    id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID,
                    value: teamId,
                }],
                prepareRecordsOnly: false,
            });

            const props = getBaseProps();
            const {getByTestId} = renderWithEverything(<PostUpdate {...props}/>, {database});

            await waitFor(() => {
                const postUpdate = getByTestId('post-update');

                // Only item-1 (state: '') and item-2 (state: 'in_progress') should be outstanding
                expect(postUpdate).toHaveProp('outstanding', 2);
            });
        });

        it('should update outstanding count when item states change', async () => {
            await operator.handlePlaybookRun({
                prepareRecordsOnly: false,
                runs: [baseRun],
                processChildren: true,
            });

            await operator.handleSystem({
                systems: [{
                    id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                    value: userId,
                }],
                prepareRecordsOnly: false,
            });

            await operator.handleSystem({
                systems: [{
                    id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID,
                    value: teamId,
                }],
                prepareRecordsOnly: false,
            });

            const props = getBaseProps();
            const {getByTestId} = renderWithEverything(<PostUpdate {...props}/>, {database});

            await waitFor(() => {
                const postUpdate = getByTestId('post-update');
                expect(postUpdate).toHaveProp('outstanding', 3);
            });

            // Update an outstanding item to closed
            const itemToClose = await getPlaybookChecklistItemById(database, 'item-2');

            act(() => {
                database.write(async () => {
                    await itemToClose!.update((item) => {
                        item.state = 'closed';
                    });
                });
            });

            await waitFor(() => {
                const postUpdate = getByTestId('post-update');
                expect(postUpdate).toHaveProp('outstanding', 2); // Should decrease from 3 to 2
            });
        });
    });
});


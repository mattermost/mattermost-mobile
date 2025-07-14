// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {General, Preferences} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {act, renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import PlaybookRunComponent from './playbook_run';

import PlaybookRun from './';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';

jest.mock('./playbook_run');
jest.mocked(PlaybookRunComponent).mockImplementation(
    (props) => React.createElement('PlaybookRun', {testID: 'playbook-run', ...props}),
);

const serverUrl = 'server-url';

describe('PlaybookRun', () => {
    const playbookRunId = 'run-id';
    const ownerId = 'owner-id';
    const participantId = 'participant-id';

    const baseRun = TestHelper.fakePlaybookRun({
        id: playbookRunId,
        owner_user_id: ownerId,
        participant_ids: [participantId, ownerId],
        checklists: [
            TestHelper.fakePlaybookChecklist(playbookRunId, {
                id: 'checklist-1',
                items: [
                    TestHelper.fakePlaybookChecklistItem(playbookRunId, {
                        id: 'item-1',
                        due_date: Date.now() - 1000,
                    }),
                    TestHelper.fakePlaybookChecklistItem(playbookRunId, {
                        id: 'item-2',
                        due_date: 0,
                    }),
                ],
            }),
            TestHelper.fakePlaybookChecklist(playbookRunId, {
                id: 'checklist-2',
                items: [
                    TestHelper.fakePlaybookChecklistItem(playbookRunId, {
                        id: 'item-3',
                        due_date: Date.now() - 1000,
                    }),
                    TestHelper.fakePlaybookChecklistItem(playbookRunId, {
                        id: 'item-4',
                        due_date: Date.now() + 1000,
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

    describe('api run', () => {
        function getBaseProps(): ComponentProps<typeof PlaybookRun> {
            return {
                playbookRunId,
                playbookRun: baseRun,
                componentId: 'PlaybookRuns' as const,
            };
        }

        it('should render correctly with no data', () => {
            const props = getBaseProps();
            const {getByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

            const playbookRun = getByTestId('playbook-run');
            expect(playbookRun.props.playbookRun).toBe(props.playbookRun);
            expect(playbookRun.props.checklists).toBe(props.playbookRun!.checklists);
            expect(playbookRun.props.overdueCount).toBe(2);

            expect(playbookRun.props.participants).toHaveLength(0);
            expect(playbookRun.props.owner).toBeUndefined();
            expect(playbookRun.props.teammateNameDisplay).toBe(General.TEAMMATE_NAME_DISPLAY.SHOW_USERNAME);
        });

        it('should render correctly with data', async () => {
            await operator.handleUsers({
                users: [
                    TestHelper.fakeUser({
                        id: ownerId,
                    }),
                    TestHelper.fakeUser({
                        id: participantId,
                    }),
                ],
                prepareRecordsOnly: false,
            });

            await operator.handleSystem({
                systems: [{
                    id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                    value: 'current-user-id',
                }],
                prepareRecordsOnly: false,
            });

            await operator.handlePreferences({
                preferences: [{
                    category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                    name: Preferences.NAME_NAME_FORMAT,
                    value: General.TEAMMATE_NAME_DISPLAY.SHOW_FULLNAME,
                    user_id: 'user-id',
                }],
                prepareRecordsOnly: false,
            });

            const props = getBaseProps();
            const {getByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

            const playbookRun = getByTestId('playbook-run');
            expect(playbookRun.props.playbookRun).toBe(props.playbookRun);
            expect(playbookRun.props.checklists).toBe(props.playbookRun!.checklists);
            expect(playbookRun.props.overdueCount).toBe(2);

            expect(playbookRun.props.participants).toHaveLength(1);
            expect(playbookRun.props.participants[0].id).toBe(participantId);
            expect(playbookRun.props.owner.id).toBe(ownerId);
            expect(playbookRun.props.currentUserId).toBe('current-user-id');
            expect(playbookRun.props.teammateNameDisplay).toBe(General.TEAMMATE_NAME_DISPLAY.SHOW_FULLNAME);
        });
    });

    describe('local run', () => {
        function getBaseProps(): ComponentProps<typeof PlaybookRun> {
            return {
                playbookRunId,
                componentId: 'PlaybookRuns',
            };
        }

        it('should render correctly with no data', () => {
            const props = getBaseProps();
            const {getByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

            const playbookRun = getByTestId('playbook-run');
            expect(playbookRun.props.playbookRun).toBeUndefined();
            expect(playbookRun.props.checklists).toHaveLength(0);
            expect(playbookRun.props.overdueCount).toBe(0);

            expect(playbookRun.props.participants).toHaveLength(0);
            expect(playbookRun.props.owner).toBeUndefined();
            expect(playbookRun.props.currentUserId).toBe('');
            expect(playbookRun.props.teammateNameDisplay).toBe(General.TEAMMATE_NAME_DISPLAY.SHOW_USERNAME);
        });

        it('should render correctly with model data', async () => {
            const models = await operator.handlePlaybookRun({
                prepareRecordsOnly: false,
                runs: [baseRun],
                processChildren: true,
            });

            const runModel = models[0] as PlaybookRunModel;

            await operator.handleSystem({
                systems: [{
                    id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                    value: 'current-user-id',
                }],
                prepareRecordsOnly: false,
            });

            await operator.handleUsers({
                users: [
                    TestHelper.fakeUser({
                        id: ownerId,
                    }),
                    TestHelper.fakeUser({
                        id: participantId,
                    }),
                ],
                prepareRecordsOnly: false,
            });

            await operator.handlePreferences({
                preferences: [{
                    category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                    name: Preferences.NAME_NAME_FORMAT,
                    value: General.TEAMMATE_NAME_DISPLAY.SHOW_FULLNAME,
                    user_id: 'user-id',
                }],
                prepareRecordsOnly: false,
            });

            const props = getBaseProps();
            const {getByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

            const playbookRun = getByTestId('playbook-run');
            expect(playbookRun).toBeTruthy();
            expect(playbookRun.props.playbookRun).toBeDefined();
            expect(playbookRun.props.participants).toHaveLength(1);
            expect(playbookRun.props.participants[0].id).toBe(participantId);
            expect(playbookRun.props.owner.id).toBe(ownerId);
            expect(playbookRun.props.checklists[0].id).toBe(baseRun.checklists[0].id);
            expect(playbookRun.props.checklists[1].id).toBe(baseRun.checklists[1].id);
            expect(playbookRun.props.overdueCount).toBe(2);
            expect(playbookRun.props.currentUserId).toBe('current-user-id');
            expect(playbookRun.props.teammateNameDisplay).toBe(General.TEAMMATE_NAME_DISPLAY.SHOW_FULLNAME);

            act(() => {
                database.write(async () => {
                    await runModel.update((run) => {
                        run.itemsOrder = [baseRun.checklists[1].id, baseRun.checklists[0].id];
                    });
                });
            });

            await waitFor(() => {
                expect(playbookRun.props.checklists[0].id).toBe(baseRun.checklists[1].id);
                expect(playbookRun.props.checklists[1].id).toBe(baseRun.checklists[0].id);
            });
        });
    });
});

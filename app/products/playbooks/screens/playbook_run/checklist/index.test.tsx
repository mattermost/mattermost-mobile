// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import DatabaseManager from '@database/manager';
import {getChecklistProgress} from '@playbooks/utils/progress';
import {renderWithEverything, waitFor, act} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChecklistComponent from './checklist';

import Checklist from './';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type {PlaybookChecklistModel} from '@playbooks/database/models';
import type PlaybookChecklistModelType from '@playbooks/types/database/models/playbook_checklist';

jest.mock('./checklist');
jest.mocked(ChecklistComponent).mockImplementation(
    (props: ComponentProps<typeof ChecklistComponent>) => React.createElement('Checklist', {testID: 'checklist', ...props}),
);

jest.mock('@playbooks/utils/progress');

const serverUrl = 'server-url';

describe('Checklist', () => {
    const checklistId = 'checklist-id';
    const mockProgressReturn = {
        skipped: false,
        completed: 0,
        totalNumber: 0,
        progress: 0,
    };

    jest.mocked(getChecklistProgress).mockReturnValue(mockProgressReturn);

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
        function getBaseProps(): ComponentProps<typeof Checklist> {
            return {
                checklist: TestHelper.fakePlaybookChecklist('run-id', {
                    id: checklistId,
                    items: [
                        TestHelper.createPlaybookItem(checklistId, 0),
                        TestHelper.createPlaybookItem(checklistId, 1),
                    ],
                }),
                checklistNumber: 0,
                channelId: 'channel-id',
                playbookRunId: 'run-id',
                playbookRunName: 'Test Run',
                isFinished: false,
                isParticipant: true,
            };
        }

        it('should render correctly with data', () => {
            const props = getBaseProps();
            const {getByTestId} = renderWithEverything(<Checklist {...props}/>, {database});

            const checklist = getByTestId('checklist');
            expect(checklist).toBeTruthy();
            expect(checklist.props.checklist).toBe(props.checklist);
            expect(checklist.props.items).toStrictEqual(props.checklist.items);
            expect(checklist.props.checklistProgress).toBe(mockProgressReturn);
            expect(getChecklistProgress).toHaveBeenCalledWith(props.checklist.items);
        });

        it('should pass hidden incomplete items through, keeping the canonical order', () => {
            const props = getBaseProps();
            const items: PlaybookChecklistItem[] = [
                TestHelper.createPlaybookItem(checklistId, 0), // visible normal item
                {
                    ...TestHelper.createPlaybookItem(checklistId, 1),
                    condition_action: 'hidden',
                    completed_at: 0,
                }, // hidden incomplete - hidden when rendering, but keeps its slot here
                {
                    ...TestHelper.createPlaybookItem(checklistId, 2),
                    state: 'closed',
                    completed_at: Date.now(),
                }, // completed item
            ];
            props.checklist.items = items;

            const {getByTestId} = renderWithEverything(<Checklist {...props}/>, {database});

            const checklist = getByTestId('checklist');
            expect(checklist).toBeTruthy();

            // An item's index in this array is the index the server expects for that item, so nothing
            // may be dropped here. Hiding is applied when rendering instead.
            expect(checklist.props.items).toHaveLength(3);
            expect(checklist.props.items.map((i: {id: string}) => i.id)).toEqual(items.map((i) => i.id));
        });

        it('should include hidden completed items', () => {
            const props = getBaseProps();
            props.checklist.items = [
                TestHelper.createPlaybookItem(checklistId, 0), // visible normal item
                {
                    ...TestHelper.createPlaybookItem(checklistId, 1),
                    condition_action: 'hidden',
                    state: 'closed',
                    completed_at: Date.now(),
                }, // hidden but completed - should be included
            ];

            const {getByTestId} = renderWithEverything(<Checklist {...props}/>, {database});

            const checklist = getByTestId('checklist');
            expect(checklist).toBeTruthy();

            // Should have both items (hidden completed is still visible)
            expect(checklist.props.items).toHaveLength(2);
            expect(checklist.props.items[0].id).toBe(props.checklist.items[0].id);
            expect(checklist.props.items[1].id).toBe(props.checklist.items[1].id);
        });

        it('should include shown_because_modified items', () => {
            const props = getBaseProps();
            props.checklist.items = [
                {
                    ...TestHelper.createPlaybookItem(checklistId, 0),
                    condition_action: 'shown_because_modified',
                    completed_at: 0,
                }, // shown_because_modified incomplete
                {
                    ...TestHelper.createPlaybookItem(checklistId, 1),
                    condition_action: 'shown_because_modified',
                    state: 'closed',
                    completed_at: Date.now(),
                }, // shown_because_modified completed
            ];

            const {getByTestId} = renderWithEverything(<Checklist {...props}/>, {database});

            const checklist = getByTestId('checklist');
            expect(checklist).toBeTruthy();

            // Should have both items (shown_because_modified items are always visible)
            expect(checklist.props.items).toHaveLength(2);
            expect(checklist.props.items[0].id).toBe(props.checklist.items[0].id);
            expect(checklist.props.items[1].id).toBe(props.checklist.items[1].id);
        });
    });

    describe('local run', () => {
        let itemsIds: string[];
        async function getBaseProps(): Promise<ComponentProps<typeof Checklist>> {
            const checklist = TestHelper.createPlaybookChecklist('', 2, 0);
            itemsIds = checklist.items.map((item) => item.id);

            const model = await operator.handlePlaybookChecklist({
                prepareRecordsOnly: false,
                checklists: [{
                    run_id: 'run-id',
                    ...checklist,
                    items_order: [checklist.items[1].id, checklist.items[0].id],
                }],
                processChildren: true,
            });
            return {

                // handlePlaybookChecklist can return other models,
                // but the first one is for sure a PlaybookChecklistModel
                checklist: model[0] as PlaybookChecklistModel,
                checklistNumber: 0,
                channelId: 'channel-id',
                playbookRunId: 'run-id',
                playbookRunName: 'Test Run',
                isFinished: false,
                isParticipant: true,
            };
        }

        it('should render correctly with model data', async () => {
            const props = await getBaseProps();
            const {getByTestId} = renderWithEverything(<Checklist {...props}/>, {database});

            const checklist = getByTestId('checklist');
            expect(checklist).toBeTruthy();
            expect(checklist.props.checklist.id).toBe(props.checklist.id);
            expect(checklist.props.items[0].id).toBe(itemsIds[1]);
            expect(checklist.props.items[1].id).toBe(itemsIds[0]);
            expect(checklist.props.checklistProgress).toBe(mockProgressReturn);
            expect(getChecklistProgress).toHaveBeenCalledWith([
                expect.objectContaining({id: itemsIds[1]}),
                expect.objectContaining({id: itemsIds[0]}),
            ]);

            database.write(async () => {
                if ('update' in props.checklist) {
                    await props.checklist.update((c: PlaybookChecklistModelType) => {
                        c.itemsOrder = [itemsIds[0], itemsIds[1]];
                    });
                }
            });

            await waitFor(() => {
                expect(checklist.props.items[0].id).toBe(itemsIds[0]);
                expect(checklist.props.items[1].id).toBe(itemsIds[1]);
            });
        });

        it('should pass hidden incomplete items from database through, keeping the canonical order', async () => {
            const checklist = TestHelper.createPlaybookChecklist('', 3, 0);

            // Set condition fields on items
            checklist.items[0].condition_action = ''; // visible
            checklist.items[1].condition_action = 'hidden'; // hidden incomplete - should be filtered
            checklist.items[1].completed_at = 0;
            checklist.items[2].condition_action = ''; // visible
            checklist.items[2].state = 'closed';
            checklist.items[2].completed_at = Date.now();

            const model = await operator.handlePlaybookChecklist({
                prepareRecordsOnly: false,
                checklists: [{
                    run_id: 'run-id',
                    ...checklist,
                }],
                processChildren: true,
            });

            const props = {
                checklist: model[0] as PlaybookChecklistModel,
                checklistNumber: 0,
                channelId: 'channel-id',
                playbookRunId: 'run-id',
                playbookRunName: 'Test Run',
                isFinished: false,
                isParticipant: true,
            };

            const {getByTestId} = renderWithEverything(<Checklist {...props}/>, {database});

            const checklistComponent = getByTestId('checklist');
            expect(checklistComponent).toBeTruthy();

            // Nothing is dropped here: an item's index is the index the server expects for it.
            expect(checklistComponent.props.items).toHaveLength(3);
            expect(checklistComponent.props.items.map((i: {id: string}) => i.id)).toEqual(
                checklist.items.map((i) => i.id),
            );
        });

        it('should keep emitting an item after it becomes hidden, so indices stay stable', async () => {
            const checklist = TestHelper.createPlaybookChecklist('', 2, 0);
            const model = await operator.handlePlaybookChecklist({
                prepareRecordsOnly: false,
                checklists: [{
                    run_id: 'run-id',
                    ...checklist,
                }],
                processChildren: true,
            });

            const props = {
                checklist: model[0] as PlaybookChecklistModel,
                checklistNumber: 0,
                channelId: 'channel-id',
                playbookRunId: 'run-id',
                playbookRunName: 'Test Run',
                isFinished: false,
                isParticipant: true,
            };

            const {getByTestId} = renderWithEverything(<Checklist {...props}/>, {database});

            const checklistComponent = getByTestId('checklist');
            expect(checklistComponent.props.items).toHaveLength(2);

            const initialFirstItemId = checklistComponent.props.items[0].id;
            const initialSecondItemId = checklistComponent.props.items[1].id;

            const items = await props.checklist.items.fetch();
            const itemToHide = items.find((i) => i.id === initialFirstItemId);
            await act(async () => {
                database.write(async () => {
                    await itemToHide?.update((item) => {
                        item.conditionAction = 'hidden';
                    });
                });
            });

            // Hiding an item must not remove it here: dropping it would shift the index of every
            // item after it, and those indices are what item mutations are sent to the server with.
            await waitFor(() => {
                expect(checklistComponent.props.items).toHaveLength(2);
                expect(checklistComponent.props.items[0].id).toBe(initialFirstItemId);
                expect(checklistComponent.props.items[1].id).toBe(initialSecondItemId);
            });
        });
    });
});

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import DatabaseManager from '@database/manager';
import {renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChecklistComponent from './checklist';

import Checklist from './';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type {PlaybookChecklistModel} from '@playbooks/database/models';

jest.mock('./checklist');
jest.mocked(ChecklistComponent).mockImplementation(
    (props) => React.createElement('Checklist', {testID: 'checklist', ...props}),
);

const serverUrl = 'server-url';

describe('Checklist', () => {
    const checklistId = 'checklist-id';

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
            expect(checklist.props.items).toBe(props.checklist.items);
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

            database.write(async () => {
                if ('update' in props.checklist) {
                    await props.checklist.update((c) => {
                        c.itemsOrder = [itemsIds[0], itemsIds[1]];
                    });
                }
            });

            await waitFor(() => {
                expect(checklist.props.items[0].id).toBe(itemsIds[0]);
                expect(checklist.props.items[1].id).toBe(itemsIds[1]);
            });
        });
    });
});

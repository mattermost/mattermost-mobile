// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {act, type ComponentProps} from 'react';

import {General, Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChecklistItemComponent from './checklist_item';

import ChecklistItem from './';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./checklist_item');
jest.mocked(ChecklistItemComponent).mockImplementation(
    (props) => React.createElement('ChecklistItem', {testID: 'checklist-item', ...props}),
);

const serverUrl = 'server-url';

describe('ChecklistItem', () => {
    const itemId = 'item-id';
    const checklistId = 'checklist-id';
    const assigneeId = 'assignee-id';

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

    describe('common', () => {
        it('should set the correct teammate name display', async () => {
            const props = {
                item: TestHelper.fakePlaybookChecklistItem(checklistId, {id: itemId}),
                channelId: 'channel-id',
                checklistNumber: 0,
                itemNumber: 0,
                playbookRunId: 'run-id',
                isDisabled: false,
            };

            const {getByTestId} = renderWithEverything(<ChecklistItem {...props}/>, {database});

            const checklistItem = getByTestId('checklist-item');
            expect(checklistItem.props.teammateNameDisplay).toBe(General.TEAMMATE_NAME_DISPLAY.SHOW_USERNAME);

            await act(async () => {
                await operator.handlePreferences({
                    preferences: [{
                        category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                        name: Preferences.NAME_NAME_FORMAT,
                        value: General.TEAMMATE_NAME_DISPLAY.SHOW_FULLNAME,
                        user_id: 'user-id',
                    }],
                    prepareRecordsOnly: false,
                });
            });

            await waitFor(() => {
                expect(checklistItem.props.teammateNameDisplay).toBe(General.TEAMMATE_NAME_DISPLAY.SHOW_FULLNAME);
            });
        });
    });

    describe('api run', () => {
        function getBaseProps(): ComponentProps<typeof ChecklistItem> {
            return {
                item: TestHelper.fakePlaybookChecklistItem(checklistId, {id: itemId}),
                channelId: 'channel-id',
                checklistNumber: 0,
                itemNumber: 0,
                playbookRunId: 'run-id',
                isDisabled: false,
            };
        }

        it('should render correctly without data', () => {
            const props = getBaseProps();
            const {getByTestId} = renderWithEverything(<ChecklistItem {...props}/>, {database});

            const checklistItem = getByTestId('checklist-item');
            expect(checklistItem).toBeTruthy();
            expect(checklistItem.props.item).toBe(props.item);
            expect(checklistItem.props.assignee).toBeUndefined();
            expect(checklistItem.props.teammateNameDisplay).toBe(General.TEAMMATE_NAME_DISPLAY.SHOW_USERNAME);
        });

        it('should render correctly with assignee data', async () => {
            await operator.handleUsers({
                prepareRecordsOnly: false,
                users: [TestHelper.fakeUser({id: assigneeId, username: 'testuser'})],
            });

            const props = getBaseProps();
            props.item = TestHelper.fakePlaybookChecklistItem(checklistId, {id: itemId, assignee_id: assigneeId});
            const {getByTestId} = renderWithEverything(<ChecklistItem {...props}/>, {database});

            const checklistItem = getByTestId('checklist-item');
            expect(checklistItem).toBeTruthy();
            expect(checklistItem.props.assignee).toBeDefined();
            expect(checklistItem.props.assignee.id).toBe(assigneeId);
        });

        it('should handle item without assignee', () => {
            const props = getBaseProps();
            props.item = TestHelper.fakePlaybookChecklistItem(checklistId, {
                id: itemId,
                assignee_id: '',
            });

            const {getByTestId} = renderWithEverything(<ChecklistItem {...props}/>, {database});

            const checklistItem = getByTestId('checklist-item');
            expect(checklistItem).toBeTruthy();
            expect(checklistItem.props.assignee).toBeUndefined();
        });
    });

    describe('local run', () => {
        async function getBaseProps(): Promise<ComponentProps<typeof ChecklistItem>> {
            const model = await operator.handlePlaybookChecklistItem({
                prepareRecordsOnly: false,
                items: [TestHelper.fakePlaybookChecklistItem(checklistId, {id: itemId, assignee_id: assigneeId})],
            });
            return {
                item: model[0],
                channelId: 'channel-id',
                checklistNumber: 0,
                itemNumber: 0,
                playbookRunId: 'run-id',
                isDisabled: false,
            };
        }

        it('should render correctly without data', async () => {
            const props = await getBaseProps();
            const {getByTestId} = renderWithEverything(<ChecklistItem {...props}/>, {database});

            const checklistItem = getByTestId('checklist-item');
            await waitFor(() => {
                expect(checklistItem).toBeTruthy();
                expect(checklistItem.props.item).toBe(props.item);
                expect(checklistItem.props.assignee).toBeUndefined();
                expect(checklistItem.props.teammateNameDisplay).toBe(General.TEAMMATE_NAME_DISPLAY.SHOW_USERNAME);
            });
        });

        it('should render correctly with assignee data', async () => {
            const props = await getBaseProps();

            await operator.handleUsers({
                prepareRecordsOnly: false,
                users: [TestHelper.fakeUser({id: assigneeId, username: 'testuser'})],
            });

            database.write(async () => {
                if ('update' in props.item) { // check to comply with typescript
                    props.item.update((item) => {
                        item.assigneeId = assigneeId;
                    });
                }
            });

            const {getByTestId} = renderWithEverything(<ChecklistItem {...props}/>, {database});

            const checklistItem = getByTestId('checklist-item');
            await waitFor(() => {
                expect(checklistItem).toBeTruthy();
                expect(checklistItem.props.assignee).toBeDefined();
                expect(checklistItem.props.assignee.id).toBe(assigneeId);
            });
        });

        it('should handle item without assignee', async () => {
            const props = await getBaseProps();
            database.write(async () => {
                if ('update' in props.item) { // check to comply with typescript
                    props.item.update((item) => {
                        item.assigneeId = '';
                    });
                }
            });

            const {getByTestId} = renderWithEverything(<ChecklistItem {...props}/>, {database});

            const checklistItem = getByTestId('checklist-item');
            await waitFor(() => {
                expect(checklistItem).toBeTruthy();
                expect(checklistItem.props.assignee).toBeUndefined();
            });
        });
    });
});

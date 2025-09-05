// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {General} from '@constants';
import DatabaseManager from '@database/manager';
import {getPlaybookChecklistItemById} from '@playbooks/database/queries/item';
import {act, renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChecklistItemBottomSheetComponent from './checklist_item_bottom_sheet';

import ChecklistItemBottomSheet from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./checklist_item_bottom_sheet', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(ChecklistItemBottomSheetComponent).mockImplementation(
    (props) => React.createElement('ChecklistItemBottomSheet', {testID: 'checklist_item_bottom_sheet', ...props}),
);

describe('ChecklistItemBottomSheet Enhanced Component', () => {
    const serverUrl = 'server-url';

    let database: Database;
    let operator: ServerDataOperator;

    function getBaseProps(): ComponentProps<typeof ChecklistItemBottomSheet> {
        return {
            item: TestHelper.fakePlaybookChecklistItem('checklist-id', {id: 'item-1'}),
            runId: 'run-1',
            checklistNumber: 1,
            itemNumber: 1,
            channelId: 'channel-1',
            onCheck: jest.fn(),
            onSkip: jest.fn(),
            onRunCommand: jest.fn(),
            teammateNameDisplay: General.TEAMMATE_NAME_DISPLAY.SHOW_USERNAME,
            isDisabled: false,
        };
    }

    async function addItemToDatabase(item: PartialChecklistItem) {
        await operator.handlePlaybookChecklistItem({
            prepareRecordsOnly: false,
            items: [item],
        });
    }

    async function addUserToDatabase(user: UserProfile) {
        await operator.handleUsers({
            prepareRecordsOnly: false,
            users: [user],
        });
    }

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
        jest.clearAllMocks();
    });

    afterEach(() => {
        DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('with database model item', () => {
        it('should render enhanced component with database model item', async () => {
            const rawItem = TestHelper.fakePlaybookChecklistItem('checklist-id', {id: 'item-1', assignee_id: 'user-1'});
            await addItemToDatabase(rawItem);
            await addUserToDatabase(TestHelper.fakeUser({id: 'user-1'}));

            const item = await getPlaybookChecklistItemById(database, rawItem.id);

            const props = getBaseProps();
            props.item = item!;

            const {getByTestId} = renderWithEverything(<ChecklistItemBottomSheet {...props}/>, {database});

            const bottomSheet = getByTestId('checklist_item_bottom_sheet');
            expect(bottomSheet).toBeTruthy();
            expect(bottomSheet).toHaveProp('item', item);
            expect(bottomSheet).toHaveProp('assignee', expect.objectContaining({id: 'user-1'}));
        });

        it('should handle assigneeId changes through observable', async () => {
            const rawItem = TestHelper.fakePlaybookChecklistItem('checklist-id', {id: 'item-1', assignee_id: 'user-1'});
            await addItemToDatabase(rawItem);
            await addUserToDatabase(TestHelper.fakeUser({id: 'user-1'}));
            await addUserToDatabase(TestHelper.fakeUser({id: 'user-2'}));

            const item = await getPlaybookChecklistItemById(database, rawItem.id);

            const props = getBaseProps();
            props.item = item!;

            const {getByTestId} = renderWithEverything(<ChecklistItemBottomSheet {...props}/>, {database});

            const bottomSheet = getByTestId('checklist_item_bottom_sheet');
            expect(bottomSheet).toHaveProp('assignee', expect.objectContaining({id: 'user-1'}));
            await act(async () => {
                database.write(async () => {
                    item?.update((i) => {
                        i.assigneeId = 'user-2';
                    });
                });
            });

            await waitFor(() => {
                expect(bottomSheet).toHaveProp('assignee', expect.objectContaining({id: 'user-2'}));
            });
        });

        it('should handle no assignee correctly', async () => {
            const rawItem = TestHelper.fakePlaybookChecklistItem('checklist-id', {id: 'item-1', assignee_id: ''});
            await addItemToDatabase(rawItem);

            const props = getBaseProps();
            props.item = rawItem;

            const {getByTestId} = renderWithEverything(<ChecklistItemBottomSheet {...props}/>, {database});

            const bottomSheet = getByTestId('checklist_item_bottom_sheet');
            expect(bottomSheet.props.assignee).toBeUndefined();
        });

        it('should handle missing assignee correctly', async () => {
            const rawItem = TestHelper.fakePlaybookChecklistItem('checklist-id', {id: 'item-1', assignee_id: 'missing-user-id'});
            await addItemToDatabase(rawItem);

            const props = getBaseProps();
            props.item = rawItem;

            const {getByTestId} = renderWithEverything(<ChecklistItemBottomSheet {...props}/>, {database});

            const bottomSheet = getByTestId('checklist_item_bottom_sheet');
            expect(bottomSheet.props.assignee).toBeUndefined();
        });
    });

    describe('with API item', () => {
        it('should render enhanced component with API item', async () => {
            const apiItem = TestHelper.fakePlaybookChecklistItem('checklist-id', {id: 'item-2', assignee_id: 'user-1'});
            await addUserToDatabase(TestHelper.fakeUser({id: 'user-1'}));

            const props = getBaseProps();
            props.item = apiItem;

            const {getByTestId} = renderWithEverything(<ChecklistItemBottomSheet {...props}/>, {database});

            const bottomSheet = getByTestId('checklist_item_bottom_sheet');
            expect(bottomSheet).toBeTruthy();
            expect(bottomSheet).toHaveProp('item', apiItem);
            expect(bottomSheet).toHaveProp('assignee', expect.objectContaining({id: 'user-1'}));
        });

        it('should handle assigneeId changes through observable', async () => {
            const apiItem = TestHelper.fakePlaybookChecklistItem('checklist-id', {id: 'item-2', assignee_id: 'user-1'});
            await addUserToDatabase(TestHelper.fakeUser({id: 'user-1'}));
            await addUserToDatabase(TestHelper.fakeUser({id: 'user-2'}));

            const props = getBaseProps();
            props.item = apiItem!;

            const {getByTestId, rerender} = renderWithEverything(<ChecklistItemBottomSheet {...props}/>, {database});

            const bottomSheet = getByTestId('checklist_item_bottom_sheet');
            expect(bottomSheet).toHaveProp('assignee', expect.objectContaining({id: 'user-1'}));

            // Clone the objet to pass a new reference to the render
            props.item = {...props.item};
            props.item.assignee_id = 'user-2';
            rerender(<ChecklistItemBottomSheet {...props}/>);

            expect(bottomSheet).toHaveProp('assignee', expect.objectContaining({id: 'user-2'}));
        });

        it('should handle no assignee correctly', () => {
            const apiItem = TestHelper.fakePlaybookChecklistItem('checklist-id', {id: 'item-2', assignee_id: ''});

            const props = getBaseProps();
            props.item = apiItem;

            const {getByTestId} = renderWithEverything(<ChecklistItemBottomSheet {...props}/>, {database});

            const bottomSheet = getByTestId('checklist_item_bottom_sheet');
            expect(bottomSheet).toBeTruthy();
            expect(bottomSheet).toHaveProp('item', apiItem);
            expect(bottomSheet.props.assignee).toBeUndefined();
        });

        it('should handle missing assignee correctly', () => {
            const apiItem = TestHelper.fakePlaybookChecklistItem('checklist-id', {id: 'item-2', assignee_id: 'missing-user-id'});

            const props = getBaseProps();
            props.item = apiItem;

            const {getByTestId} = renderWithEverything(<ChecklistItemBottomSheet {...props}/>, {database});

            const bottomSheet = getByTestId('checklist_item_bottom_sheet');
            expect(bottomSheet).toBeTruthy();
            expect(bottomSheet).toHaveProp('item', apiItem);
            expect(bottomSheet.props.assignee).toBeUndefined();
        });
    });
});

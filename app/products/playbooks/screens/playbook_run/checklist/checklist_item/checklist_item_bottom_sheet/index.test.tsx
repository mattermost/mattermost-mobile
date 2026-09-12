// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {General, Preferences} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
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

    const timelineEvent: TimelineEvent = {
        id: 'event-1',
        playbook_run_id: 'run-1',
        create_at: 1000,
        event_at: 1000,
        event_type: 'task_state_modified',
        summary: '',
        details: JSON.stringify({action: 'check', item_id: 'item-1'}),
        post_id: '',
        subject_user_id: 'activity-actor',
        creator_user_id: 'activity-actor',
    };

    function getBaseProps(): ComponentProps<typeof ChecklistItemBottomSheet> {
        return {
            item: TestHelper.fakePlaybookChecklistItem('checklist-id', {id: 'item-1'}),
            runId: 'run-1',
            timelineEvents: [],
            checklistNumber: 1,
            itemNumber: 1,
            channelId: 'channel-1',
            onCheck: jest.fn(),
            onSkip: jest.fn(),
            onRunCommand: jest.fn(),
            teammateNameDisplay: General.TEAMMATE_NAME_DISPLAY.SHOW_USERNAME,
            isDisabled: false,
            conditionReason: '',
            showConditionIcon: false,
            conditionIconColor: '#000000',
        };
    }

    async function addItemToDatabase(item: PartialChecklistItem) {
        await operator.handlePlaybookChecklistItem({
            prepareRecordsOnly: false,
            items: [item],
        });
    }

    async function addRunToDatabase(run: PartialPlaybookRun) {
        await operator.handlePlaybookRun({
            prepareRecordsOnly: false,
            runs: [run],
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
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: 'currentUser'}], prepareRecordsOnly: false});
        await addUserToDatabase(TestHelper.fakeUser({id: 'currentUser', timezone: {useAutomaticTimezone: false, manualTimezone: 'America/New_York', automaticTimezone: 'America/New_York'}}));
        jest.clearAllMocks();
    });

    afterEach(() => {
        DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('with database model item', () => {
        it('should render enhanced component with database model item', async () => {
            const rawItem = TestHelper.fakePlaybookChecklistItem('checklist-id', {id: 'item-1', assignee_id: 'user-1'});
            const rawRun = TestHelper.fakePlaybookRun({id: 'run-1', participant_ids: ['user-1', 'user-2'], name: 'Run 1'});
            await addRunToDatabase(rawRun);
            await addItemToDatabase(rawItem);
            await addUserToDatabase(TestHelper.fakeUser({id: 'user-1'}));

            const item = await getPlaybookChecklistItemById(database, rawItem.id);

            const props = getBaseProps();
            props.runId = rawRun.id;
            props.item = item!;

            const {getByTestId} = renderWithEverything(<ChecklistItemBottomSheet {...props}/>, {database});

            const bottomSheet = getByTestId('checklist_item_bottom_sheet');
            expect(bottomSheet).toBeTruthy();
            expect(bottomSheet).toHaveProp('item', item);
            expect(bottomSheet).toHaveProp('assignee', expect.objectContaining({id: 'user-1'}));
            expect(bottomSheet).toHaveProp('currentUserTimezone', expect.objectContaining({useAutomaticTimezone: false, manualTimezone: 'America/New_York', automaticTimezone: 'America/New_York'}));
            expect(bottomSheet).toHaveProp('participantIds', ['user-1', 'user-2']);
            expect(bottomSheet).toHaveProp('runName', 'Run 1');
        });

        it('should resolve the military time display preference', async () => {
            const rawItem = TestHelper.fakePlaybookChecklistItem('checklist-id', {id: 'item-1'});
            await addItemToDatabase(rawItem);

            const item = await getPlaybookChecklistItemById(database, rawItem.id);

            const props = getBaseProps();
            props.item = item!;

            const {getByTestId} = renderWithEverything(<ChecklistItemBottomSheet {...props}/>, {database});

            const bottomSheet = getByTestId('checklist_item_bottom_sheet');
            expect(bottomSheet).toHaveProp('isMilitaryTime', false);

            await act(async () => {
                await operator.handlePreferences({
                    preferences: [{
                        category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                        name: Preferences.USE_MILITARY_TIME,
                        value: 'true',
                        user_id: 'currentUser',
                    }],
                    prepareRecordsOnly: false,
                });
            });

            await waitFor(() => {
                expect(bottomSheet).toHaveProp('isMilitaryTime', true);
            });
        });

        it('should resolve the task activity from the run and follow the item while open', async () => {
            const rawItem = TestHelper.fakePlaybookChecklistItem('checklist-id', {id: 'item-1', state: 'closed', state_modified: 1000});
            const rawRun = TestHelper.fakePlaybookRun({id: 'run-1', timeline_events: [timelineEvent]});
            await addRunToDatabase(rawRun);
            await addItemToDatabase(rawItem);
            await addUserToDatabase(TestHelper.fakeUser({id: 'activity-actor'}));

            const item = await getPlaybookChecklistItemById(database, rawItem.id);

            const props = getBaseProps();
            props.runId = rawRun.id;
            props.item = item!;

            const {getByTestId} = renderWithEverything(<ChecklistItemBottomSheet {...props}/>, {database});

            const bottomSheet = getByTestId('checklist_item_bottom_sheet');
            await waitFor(() => {
                expect(bottomSheet).toHaveProp('activity', {action: 'check', actorUserId: 'activity-actor', timestamp: 1000});
                expect(bottomSheet).toHaveProp('activityActor', expect.objectContaining({id: 'activity-actor'}));
            });

            // The task being unchecked elsewhere has to reach the open sheet.
            await act(async () => {
                await database.write(async () => {
                    await item?.update((i) => {
                        i.state = '';
                        i.stateModified = 2000;
                    });
                });
            });

            await waitFor(() => {
                expect(bottomSheet).toHaveProp('activity', {action: 'uncheck', actorUserId: undefined, timestamp: 2000});
                expect(bottomSheet.props.activityActor).toBeUndefined();
            });
        });

        it('should handle missing run correctly', async () => {
            const rawItem = TestHelper.fakePlaybookChecklistItem('checklist-id', {id: 'item-1', assignee_id: 'user-1'});
            await addItemToDatabase(rawItem);

            const item = await getPlaybookChecklistItemById(database, rawItem.id);

            const props = getBaseProps();
            props.runId = 'missing-run-id';
            props.item = item!;

            const {getByTestId} = renderWithEverything(<ChecklistItemBottomSheet {...props}/>, {database});

            const bottomSheet = getByTestId('checklist_item_bottom_sheet');
            expect(bottomSheet).toBeTruthy();
            expect(bottomSheet).toHaveProp('participantIds', []);
            expect(bottomSheet).toHaveProp('runName', '');
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
            expect(bottomSheet).toHaveProp('currentUserTimezone', expect.objectContaining({useAutomaticTimezone: false, manualTimezone: 'America/New_York', automaticTimezone: 'America/New_York'}));
            expect(bottomSheet).toHaveProp('participantIds', []);
        });

        it('should resolve the task activity from the given timeline events', async () => {
            await addUserToDatabase(TestHelper.fakeUser({id: 'activity-actor'}));

            const props = getBaseProps();
            props.item = TestHelper.fakePlaybookChecklistItem('checklist-id', {id: 'item-1', state: 'closed', state_modified: 1000});
            props.timelineEvents = [timelineEvent];

            const {getByTestId} = renderWithEverything(<ChecklistItemBottomSheet {...props}/>, {database});

            const bottomSheet = getByTestId('checklist_item_bottom_sheet');
            await waitFor(() => {
                expect(bottomSheet).toHaveProp('activity', {action: 'check', actorUserId: 'activity-actor', timestamp: 1000});
                expect(bottomSheet).toHaveProp('activityActor', expect.objectContaining({id: 'activity-actor'}));
            });
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

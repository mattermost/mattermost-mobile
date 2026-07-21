// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {act, type ComponentProps} from 'react';

import {General, Preferences} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChecklistItemComponent from './checklist_item';

import ChecklistItem from './';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';

jest.mock('./checklist_item');
jest.mocked(ChecklistItemComponent).mockImplementation(
    (props: ComponentProps<typeof ChecklistItemComponent>) => React.createElement('ChecklistItem', {testID: 'checklist-item', ...props}),
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
                timelineEvents: [],
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

        it('should resolve the military time display preference', async () => {
            const props = {
                item: TestHelper.fakePlaybookChecklistItem(checklistId, {id: itemId}),
                timelineEvents: [],
                channelId: 'channel-id',
                checklistNumber: 0,
                itemNumber: 0,
                playbookRunId: 'run-id',
                isDisabled: false,
            };

            const {getByTestId} = renderWithEverything(<ChecklistItem {...props}/>, {database});

            const checklistItem = getByTestId('checklist-item');
            expect(checklistItem.props.isMilitaryTime).toBe(false);

            await act(async () => {
                await operator.handlePreferences({
                    preferences: [{
                        category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                        name: Preferences.USE_MILITARY_TIME,
                        value: 'true',
                        user_id: 'user-id',
                    }],
                    prepareRecordsOnly: false,
                });
            });

            await waitFor(() => {
                expect(checklistItem.props.isMilitaryTime).toBe(true);
            });
        });

        it('should resolve the current user timezone', async () => {
            const props = {
                item: TestHelper.fakePlaybookChecklistItem(checklistId, {id: itemId}),
                timelineEvents: [],
                channelId: 'channel-id',
                checklistNumber: 0,
                itemNumber: 0,
                playbookRunId: 'run-id',
                isDisabled: false,
            };

            const {getByTestId} = renderWithEverything(<ChecklistItem {...props}/>, {database});

            const checklistItem = getByTestId('checklist-item');

            // Default value is empty string when no user/timezone is set
            expect(checklistItem.props.timezone).toBe('');

            await act(async () => {
                await operator.handleUsers({
                    prepareRecordsOnly: false,
                    users: [TestHelper.fakeUser({id: 'user-id', timezone: {useAutomaticTimezone: false, automaticTimezone: '', manualTimezone: 'Asia/Kolkata'}})],
                });
                await operator.handleSystem({
                    prepareRecordsOnly: false,
                    systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: 'user-id'}],
                });
            });

            await waitFor(() => {
                expect(checklistItem.props.timezone).toBe('Asia/Kolkata');
            });
        });

        it('should set the correct channel type', async () => {
            const props = {
                item: TestHelper.fakePlaybookChecklistItem(checklistId, {id: itemId}),
                timelineEvents: [],
                channelId: 'channel-id',
                checklistNumber: 0,
                itemNumber: 0,
                playbookRunId: 'run-id',
                isDisabled: false,
            };

            const {getByTestId} = renderWithEverything(<ChecklistItem {...props}/>, {database});

            // Default value is open channel
            const checklistItem = getByTestId('checklist-item');
            expect(checklistItem.props.channelType).toBe(General.OPEN_CHANNEL);

            await act((async () => {
                await operator.handleChannel({
                    prepareRecordsOnly: false,
                    channels: [TestHelper.fakeChannel({id: 'channel-id', type: General.PRIVATE_CHANNEL})],
                });
            }));

            await waitFor(() => {
                expect(checklistItem.props.channelType).toBe(General.PRIVATE_CHANNEL);
            });
        });

        it('should set the correct current user id', async () => {
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

            // Default value is empty string
            expect(checklistItem.props.currentUserId).toBe('');

            await act((async () => {
                await operator.handleSystem({
                    prepareRecordsOnly: false,
                    systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: 'user-id'}],
                });
            }));

            await waitFor(() => {
                expect(checklistItem.props.currentUserId).toBe('user-id');
            });
        });
    });

    describe('api run', () => {
        function getBaseProps(): ComponentProps<typeof ChecklistItem> {
            return {
                item: TestHelper.fakePlaybookChecklistItem(checklistId, {id: itemId}),
                timelineEvents: [],
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

        it('resolves and refreshes the task activity actor from timeline events', async () => {
            const actorId = 'activity-actor-id';
            await operator.handleUsers({
                prepareRecordsOnly: false,
                users: [TestHelper.fakeUser({id: actorId, username: 'activity-actor'})],
            });
            const props = getBaseProps();
            props.item = TestHelper.fakePlaybookChecklistItem(checklistId, {
                id: itemId,
                state: 'closed',
                state_modified: 1000,
                title: 'Task title',
            });

            const {getByTestId, rerender} = renderWithEverything(<ChecklistItem {...props}/>, {database});
            const checklistItem = getByTestId('checklist-item');
            expect(checklistItem.props.activity).toEqual({action: 'check', timestamp: 1000, actorUserId: undefined});
            expect(checklistItem.props.activityActor).toBeUndefined();

            props.timelineEvents = [{
                id: 'event-id',
                playbook_run_id: 'run-id',
                create_at: 1000,
                event_at: 1000,
                event_type: 'task_state_modified',
                summary: '',
                details: JSON.stringify({action: 'check', task: 'Task title'}),
                post_id: '',
                subject_user_id: actorId,
                creator_user_id: actorId,
            }];
            rerender(<ChecklistItem {...props}/>);

            await waitFor(() => {
                expect(checklistItem.props.activity.actorUserId).toBe(actorId);
                expect(checklistItem.props.activityActor.id).toBe(actorId);
            });
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
                timelineEvents: [],
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
                    props.item.update((item: PlaybookChecklistItemModel) => {
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
                    props.item.update((item: PlaybookChecklistItemModel) => {
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

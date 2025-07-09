// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import UserChip from '@components/chips/user_chip';
import UserAvatarsStack from '@components/user_avatars_stack';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import DatabaseManager from '@database/manager';
import {openUserProfileModal} from '@screens/navigation';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChecklistList from './checklist_list';
import ErrorState from './error_state';
import OutOfDateHeader from './out_of_date_header/index';
import PlaybookRun from './playbook_run';
import StatusUpdateIndicator from './status_update_indicator';

import type {Database} from '@nozbe/watermelondb';
import type {PlaybookRunModel} from '@playbooks/database/models';

const serverUrl = 'some.server.url';
jest.mock('@context/server');
jest.mocked(useServerUrl).mockReturnValue(serverUrl);

jest.mock('@components/chips/user_chip');
jest.mocked(UserChip).mockImplementation(
    (props) => React.createElement('UserChip', {testID: 'user-chip', ...props}),
);

jest.mock('@components/user_avatars_stack');
jest.mocked(UserAvatarsStack).mockImplementation(
    (props) => React.createElement('UserAvatarsStack', {testID: 'user-avatars-stack', ...props}),
);

jest.mock('./checklist_list');
jest.mocked(ChecklistList).mockImplementation(
    (props) => React.createElement('ChecklistList', {testID: 'checklist-list', ...props}),
);

jest.mock('./error_state');
jest.mocked(ErrorState).mockImplementation(
    () => React.createElement('ErrorState', {testID: 'error-state'}),
);

jest.mock('./out_of_date_header');
jest.mocked(OutOfDateHeader).mockImplementation(
    (props) => React.createElement('OutOfDateHeader', {testID: 'out-of-date-header', ...props}),
);

jest.mock('./status_update_indicator');
jest.mocked(StatusUpdateIndicator).mockImplementation(
    (props) => React.createElement('StatusUpdateIndicator', {testID: 'status-update-indicator', ...props}),
);

describe('PlaybookRun', () => {
    let database: Database;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    function getBaseProps(): ComponentProps<typeof PlaybookRun> {
        const mockPlaybookRun = TestHelper.fakePlaybookRunModel({
            id: 'run-1',
            name: 'Test Playbook Run',
            summary: 'Test summary',
            endAt: 0, // Not finished
            lastSyncAt: 12345,
        });

        const mockOwner = TestHelper.fakeUserModel({
            id: 'owner-1',
            username: 'owner',
        });

        const mockParticipants = [
            TestHelper.fakeUserModel({
                id: 'participant-1',
                username: 'participant1',
            }),
            TestHelper.fakeUserModel({
                id: 'participant-2',
                username: 'participant2',
            }),
        ];

        const mockChecklists = [
            TestHelper.fakePlaybookChecklistModel({
                id: 'checklist-1',
                title: 'Test Checklist',
            }),
        ];

        return {
            playbookRun: mockPlaybookRun,
            owner: mockOwner,
            participants: mockParticipants,
            componentId: 'PlaybookRun',
            checklists: mockChecklists,
            overdueCount: 2,
            currentUserId: 'current-user',
            teammateNameDisplay: General.TEAMMATE_NAME_DISPLAY.SHOW_USERNAME,
        };
    }

    it('renders out of date header with correct props', () => {
        const props = getBaseProps();
        const {getByTestId, rerender} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        const outOfDateHeader = getByTestId('out-of-date-header');
        expect(outOfDateHeader.props.serverUrl).toBe(serverUrl);
        expect(outOfDateHeader.props.lastSyncAt).toBe((props.playbookRun as PlaybookRunModel).lastSyncAt);

        (props.playbookRun as PlaybookRunModel).lastSyncAt = 54321;

        rerender(<PlaybookRun {...props}/>);

        expect(outOfDateHeader.props.lastSyncAt).toBe(54321);
    });

    it('renders playbook run intro correctly', () => {
        const props = getBaseProps();
        const {getByText, getByTestId, queryByText, rerender} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        expect(getByText(props.playbookRun!.name)).toBeTruthy();
        expect(getByText(props.playbookRun!.summary)).toBeTruthy();
        expect(queryByText('Finished')).toBeNull();

        const statusUpdateIndicator = getByTestId('status-update-indicator');
        expect(statusUpdateIndicator.props.isFinished).toBe(false);
        expect(statusUpdateIndicator.props.timestamp).toBe((props.playbookRun as PlaybookRunModel).lastStatusUpdateAt);

        (props.playbookRun as PlaybookRunModel).currentStatus = 'Finished';
        (props.playbookRun as PlaybookRunModel).lastStatusUpdateAt = 1234567890;
        rerender(<PlaybookRun {...props}/>);

        expect(getByText('Finished')).toBeVisible();
        expect(statusUpdateIndicator.props.isFinished).toBe(true);
        expect(statusUpdateIndicator.props.timestamp).toBe((props.playbookRun as PlaybookRunModel).endAt);
    });

    it('renders the people row correctly', () => {
        const props = getBaseProps();
        const owner = props.owner;
        const {getByTestId, getByText, queryByText, queryByTestId, rerender} = renderWithEverything(<PlaybookRun {...props}/>, {database});
        const peopleRow = getByTestId('people-row');
        expect(peopleRow).toBeTruthy();

        expect(getByText('Owner')).toBeTruthy();
        const ownerChip = getByTestId('user-chip');
        expect(ownerChip.props.user).toBe(props.owner);
        expect(ownerChip.props.onPress).toBeDefined();
        expect(ownerChip.props.teammateNameDisplay).toBe(General.TEAMMATE_NAME_DISPLAY.SHOW_USERNAME);

        ownerChip.props.onPress();
        expect(openUserProfileModal).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
            userId: props.owner!.id,
            channelId: (props.playbookRun as PlaybookRunModel).channelId,
            location: 'PlaybookRun',
        });

        expect(getByText('Participants')).toBeTruthy();
        const userAvatarsStack = getByTestId('user-avatars-stack');
        expect(userAvatarsStack.props.users).toBe(props.participants);
        expect(userAvatarsStack.props.location).toBe('PlaybookRun');
        expect(userAvatarsStack.props.bottomSheetTitle.defaultMessage).toBe('Run Participants');

        props.owner = undefined;
        rerender(<PlaybookRun {...props}/>);

        expect(queryByText('Owner')).toBeNull();
        expect(queryByText('Participants')).toBeTruthy();

        props.participants = [];
        rerender(<PlaybookRun {...props}/>);

        expect(queryByTestId('people-row')).toBeNull();

        props.owner = owner;
        rerender(<PlaybookRun {...props}/>);

        expect(queryByText('Owner')).toBeTruthy();
        expect(queryByText('Participants')).toBeNull();
    });

    it('renders checklist list correctly', () => {
        const props = getBaseProps();
        const {getByTestId, getByText, queryByText, rerender} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        expect(getByText('Tasks')).toBeTruthy();
        expect(getByText(/overdue/)).toBeTruthy();

        const checklistList = getByTestId('checklist-list');
        expect(checklistList.props.checklists).toBe(props.checklists);
        expect(checklistList.props.channelId).toBe((props.playbookRun as PlaybookRunModel).channelId);
        expect(checklistList.props.playbookRunId).toBe(props.playbookRun!.id);
        expect(checklistList.props.isFinished).toBe(false);
        expect(checklistList.props.isParticipant).toBe(false);

        props.overdueCount = 0;
        (props.playbookRun as PlaybookRunModel).currentStatus = 'Finished';
        props.participants.push(TestHelper.fakeUserModel({id: props.currentUserId}));
        rerender(<PlaybookRun {...props}/>);

        expect(queryByText(/overdue/)).toBeNull();

        expect(checklistList.props.isFinished).toBe(true);
        expect(checklistList.props.isParticipant).toBe(true);

        props.owner = props.participants.pop();
        rerender(<PlaybookRun {...props}/>);

        expect(checklistList.props.isParticipant).toBe(true);
    });

    it('renders error state when no playbook run', () => {
        const props = getBaseProps();
        props.playbookRun = undefined;
        const {getByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        expect(getByTestId('error-state')).toBeTruthy();
    });
});

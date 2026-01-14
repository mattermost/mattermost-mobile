// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {act, type ComponentProps} from 'react';
import {Alert} from 'react-native';

import UserChip from '@components/chips/user_chip';
import CompassIcon from '@components/compass_icon';
import UserAvatarsStack from '@components/user_avatars_stack';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import DatabaseManager from '@database/manager';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {finishRun, setOwner} from '@playbooks/actions/remote/runs';
import {PLAYBOOK_RUN_TYPES} from '@playbooks/constants/playbook_run';
import {openUserProfileModal, popTopScreen} from '@screens/navigation';
import {fireEvent, renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {showPlaybookErrorSnackbar} from '@utils/snack_bar';

import {goToEditPlaybookRun, goToSelectUser} from '../navigation';

import ChecklistList from './checklist_list';
import ErrorState from './error_state';
import OutOfDateHeader from './out_of_date_header/index';
import PlaybookRun from './playbook_run';
import StatusUpdateIndicator from './status_update_indicator';

import type {Database} from '@nozbe/watermelondb';
import type {PlaybookRunModel} from '@playbooks/database/models';

const serverUrl = 'some.server.url';

jest.mock('@utils/snack_bar');

jest.mock('@components/compass_icon', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(CompassIcon).mockImplementation(
    (props) => React.createElement('CompassIcon', {testID: 'compass-icon', ...props}) as any, // override the type since it is expecting a class component
);

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

jest.mock('../navigation', () => ({
    goToEditPlaybookRun: jest.fn(),
    goToSelectUser: jest.fn(),
}));

jest.mock('@playbooks/actions/remote/runs', () => ({
    finishRun: jest.fn(),
    setOwner: jest.fn(),
}));

jest.mock('@hooks/android_back_handler');

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
            pendingCount: 3,
            currentUserId: 'current-user',
            teammateNameDisplay: General.TEAMMATE_NAME_DISPLAY.SHOW_USERNAME,
            canEditSummary: true,
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
        expect(ownerChip.props.action).toBe(undefined);

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
        expect(userAvatarsStack.props.bottomSheetTitle.defaultMessage).toBe('Participants');

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

    it('handles owner chip action when not read only', () => {
        const props = getBaseProps();
        props.participants.push(TestHelper.fakeUserModel({id: props.currentUserId}));
        const {getByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        const ownerChip = getByTestId('user-chip');
        expect(ownerChip).toHaveProp('action', {icon: 'downArrow', onPress: expect.any(Function)});
        ownerChip.props.action.onPress();

        expect(goToSelectUser).toHaveBeenCalledWith(
            expect.anything(),
            'Test Playbook Run',
            'Owner',
            [...props.participants.map((p) => p.id), props.owner!.id],
            props.owner!.id,
            expect.any(Function),
        );
        expect(openUserProfileModal).not.toHaveBeenCalled();

        let handleSelect = jest.mocked(goToSelectUser).mock.calls[0][5];
        handleSelect(TestHelper.fakeUser({id: 'user-2'}));

        expect(setOwner).toHaveBeenCalledWith(
            serverUrl,
            props.playbookRun!.id,
            'user-2',
        );
        expect(showPlaybookErrorSnackbar).not.toHaveBeenCalled();

        jest.mocked(goToSelectUser).mockClear();
        jest.mocked(setOwner).mockClear();

        // Test also pressing on the whole chip
        ownerChip.props.onPress();

        expect(goToSelectUser).toHaveBeenCalledWith(
            expect.anything(),
            'Test Playbook Run',
            'Owner',
            [...props.participants.map((p) => p.id), props.owner!.id],
            props.owner!.id,
            expect.any(Function),
        );
        expect(openUserProfileModal).not.toHaveBeenCalled();

        handleSelect = jest.mocked(goToSelectUser).mock.calls[0][5];
        handleSelect(TestHelper.fakeUser({id: 'user-2'}));

        expect(setOwner).toHaveBeenCalledWith(
            serverUrl,
            props.playbookRun!.id,
            'user-2',
        );
        expect(showPlaybookErrorSnackbar).not.toHaveBeenCalled();
    });

    it('handles set owner error', async () => {
        const props = getBaseProps();
        props.participants.push(TestHelper.fakeUserModel({id: props.currentUserId}));
        jest.mocked(setOwner).mockResolvedValue({error: 'error'});
        const {getByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        const ownerChip = getByTestId('user-chip');
        ownerChip.props.onPress();

        const handleSelect = jest.mocked(goToSelectUser).mock.calls[0][5];
        handleSelect(TestHelper.fakeUser({id: 'user-2'}));

        await waitFor(() => {
            expect(showPlaybookErrorSnackbar).toHaveBeenCalled();
        });
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

    it('renders finish run button when not read only', () => {
        const props = getBaseProps();
        props.participants.push(TestHelper.fakeUserModel({id: props.currentUserId}));

        const {getByText} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        expect(getByText('Finish')).toBeTruthy();
    });

    it('handles finish run button press', () => {
        const props = getBaseProps();
        props.participants.push(TestHelper.fakeUserModel({id: props.currentUserId}));
        const {getByText} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        const finishRunButton = getByText('Finish');
        fireEvent.press(finishRunButton);

        expect(Alert.alert).toHaveBeenCalledWith(
            'Finish',
            'There are 3 tasks pending.\n\nAre you sure you want to finish the checklist for all participants?',
            [
                {text: 'Cancel', style: 'cancel'},
                {text: 'Finish', style: 'destructive', onPress: expect.any(Function)},
            ],
        );
        const finishAction = jest.mocked(Alert.alert).mock.calls[0][2]![1];
        finishAction.onPress?.();
        expect(finishRun).toHaveBeenCalledWith(serverUrl, props.playbookRun!.id);
    });

    it('handles finish run button press with no pending tasks', () => {
        const props = getBaseProps();
        props.participants.push(TestHelper.fakeUserModel({id: props.currentUserId}));
        props.pendingCount = 0;
        jest.mocked(Alert.alert).mockClear();
        const {getByText} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        const finishRunButton = getByText('Finish');
        fireEvent.press(finishRunButton);

        expect(Alert.alert).toHaveBeenCalledWith(
            'Finish',
            'Are you sure you want to finish the checklist for all participants?',
            [
                {text: 'Cancel', style: 'cancel'},
                {text: 'Finish', style: 'destructive', onPress: expect.any(Function)},
            ],
        );
        const finishAction = jest.mocked(Alert.alert).mock.calls[0][2]![1];
        finishAction.onPress?.();
        expect(finishRun).toHaveBeenCalledWith(serverUrl, props.playbookRun!.id);
    });

    it('does not render finish run button when read only', () => {
        const props = getBaseProps();
        const {queryByText} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        expect(queryByText('Finish')).toBeNull();
    });

    it('shows the error snackbar when finishing run fails', async () => {
        const props = getBaseProps();
        props.participants.push(TestHelper.fakeUserModel({id: props.currentUserId}));
        jest.mocked(finishRun).mockResolvedValue({error: 'error'});
        const {getByText} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        const finishRunButton = getByText('Finish');
        fireEvent.press(finishRunButton);

        const finishAction = jest.mocked(Alert.alert).mock.calls[0][2]![1];
        finishAction.onPress?.();

        await waitFor(() => {
            expect(showPlaybookErrorSnackbar).toHaveBeenCalled();
        });
    });

    it('does android hardware back handler', () => {
        const props = getBaseProps();
        renderWithEverything(<PlaybookRun {...props}/>, {database});

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(props.componentId, expect.any(Function));

        const closeHandler = jest.mocked(useAndroidHardwareBackHandler).mock.calls[0][1];
        closeHandler();

        expect(popTopScreen).toHaveBeenCalled();
    });

    it('does not render StatusUpdateIndicator for ChannelChecklistType', () => {
        const props = getBaseProps();
        (props.playbookRun as PlaybookRunModel).type = PLAYBOOK_RUN_TYPES.ChannelChecklistType;
        const {queryByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        expect(queryByTestId('status-update-indicator')).toBeNull();
    });

    it('renders StatusUpdateIndicator for PlaybookType', () => {
        const props = getBaseProps();
        (props.playbookRun as PlaybookRunModel).type = PLAYBOOK_RUN_TYPES.PlaybookType;
        const {getByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        expect(getByTestId('status-update-indicator')).toBeTruthy();
    });

    it('handles openOwnerProfile when owner is undefined', () => {
        const props = getBaseProps();
        props.owner = undefined;
        jest.mocked(openUserProfileModal).mockClear();
        const {queryByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        // Should not crash, but owner chip won't be rendered
        expect(queryByTestId('user-chip')).toBeNull();
    });

    it('handles openChangeOwnerModal when owner is undefined', () => {
        const props = getBaseProps();
        props.owner = undefined;
        jest.mocked(goToSelectUser).mockClear();
        const {queryByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        // Should not crash, but owner chip won't be rendered
        expect(queryByTestId('user-chip')).toBeNull();
        expect(goToSelectUser).not.toHaveBeenCalled();
    });

    it('handles handleSelectOwner when playbookRun is undefined', () => {
        // This test verifies the early return in handleSelectOwner
        // Since the component shows ErrorState when playbookRun is undefined,
        // we can't test the callback directly, but we verify the component handles it gracefully
        const props = getBaseProps();
        props.playbookRun = undefined;
        const {getByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        // Component should render ErrorState when playbookRun is undefined
        expect(getByTestId('error-state')).toBeTruthy();
    });

    it('handles handleFinishRun when playbookRun is undefined', () => {
        const props = getBaseProps();
        props.participants.push(TestHelper.fakeUserModel({id: props.currentUserId}));
        props.playbookRun = undefined;
        jest.mocked(Alert.alert).mockClear();
        renderWithEverything(<PlaybookRun {...props}/>, {database});

        // Should not show alert when playbookRun is undefined
        expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('handles channelId from model type', () => {
        const props = getBaseProps();
        (props.playbookRun as PlaybookRunModel).channelId = 'channel-id-123';
        const {getByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        const checklistList = getByTestId('checklist-list');
        expect(checklistList.props.channelId).toBe('channel-id-123');
    });

    it('handles channel_id from API type', () => {
        const props = getBaseProps();
        const apiRun = TestHelper.fakePlaybookRun({
            id: 'run-1',
            name: 'Test Playbook Run',
            summary: 'Test summary',
            channel_id: 'api-channel-id-456',
        });
        props.playbookRun = apiRun;
        const {getByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        const checklistList = getByTestId('checklist-list');
        expect(checklistList.props.channelId).toBe('api-channel-id-456');
    });

    it('defaults channelId to empty string when missing', () => {
        const props = getBaseProps();
        const apiRun = TestHelper.fakePlaybookRun({
            id: 'run-1',
            name: 'Test Playbook Run',
            summary: 'Test summary',
        });
        const runWithoutChannelId = {...apiRun} as Record<string, unknown>;
        delete runWithoutChannelId.channel_id;
        props.playbookRun = runWithoutChannelId as unknown as PlaybookRunModel;
        const {getByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        const checklistList = getByTestId('checklist-list');
        expect(checklistList.props.channelId).toBe('');
    });

    it('handles lastSyncAt from model type', () => {
        const props = getBaseProps();
        (props.playbookRun as PlaybookRunModel).lastSyncAt = 99999;
        const {getByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        const outOfDateHeader = getByTestId('out-of-date-header');
        expect(outOfDateHeader.props.lastSyncAt).toBe(99999);
    });

    it('defaults lastSyncAt to 0 when missing', () => {
        const props = getBaseProps();
        const apiRun = TestHelper.fakePlaybookRun({
            id: 'run-1',
            name: 'Test Playbook Run',
            summary: 'Test summary',
        });
        props.playbookRun = apiRun;
        const {getByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        const outOfDateHeader = getByTestId('out-of-date-header');
        expect(outOfDateHeader.props.lastSyncAt).toBe(0);
    });

    it('sets isParticipant to true when owner is current user', () => {
        const props = getBaseProps();
        props.owner = TestHelper.fakeUserModel({id: props.currentUserId});
        props.participants = [];
        const {getByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        const checklistList = getByTestId('checklist-list');
        expect(checklistList.props.isParticipant).toBe(true);
    });

    it('sets readOnly to true when finished even if user is participant', () => {
        const props = getBaseProps();
        props.participants.push(TestHelper.fakeUserModel({id: props.currentUserId}));
        (props.playbookRun as PlaybookRunModel).currentStatus = 'Finished';
        const {queryByText} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        // Finish button should not be rendered when readOnly is true
        expect(queryByText('Finish')).toBeNull();
    });

    it('defaults playbookRunType to PlaybookType when type is undefined but playbookId exists', () => {
        const props = getBaseProps();
        const run = props.playbookRun as PlaybookRunModel;
        delete (run as Partial<PlaybookRunModel>).type;
        run.playbookId = 'playbook-id-123';
        const {getByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        // StatusUpdateIndicator should be rendered for PlaybookType
        expect(getByTestId('status-update-indicator')).toBeTruthy();
    });

    it('defaults playbookRunType to ChannelChecklistType when type is undefined and playbookId is empty', () => {
        const props = getBaseProps();
        const run = props.playbookRun as PlaybookRunModel;
        delete (run as Partial<PlaybookRunModel>).type;
        run.playbookId = '';
        const {queryByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        // StatusUpdateIndicator should not be rendered for ChannelChecklistType
        expect(queryByTestId('status-update-indicator')).toBeNull();
    });

    it('handles playbookRunType with playbook_id from API type', () => {
        const props = getBaseProps();
        const apiRun = TestHelper.fakePlaybookRun({
            id: 'run-1',
            name: 'Test Playbook Run',
            summary: 'Test summary',
            playbook_id: 'api-playbook-id-789',
        });
        const runWithoutType = {...apiRun} as Record<string, unknown>;
        delete runWithoutType.type;
        props.playbookRun = runWithoutType as unknown as PlaybookRunModel;
        const {getByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        // StatusUpdateIndicator should be rendered for PlaybookType
        expect(getByTestId('status-update-indicator')).toBeTruthy();
    });

    it('handles playbookRunType with empty playbook_id from API type', () => {
        const props = getBaseProps();
        const apiRun = TestHelper.fakePlaybookRun({
            id: 'run-1',
            name: 'Test Playbook Run',
            summary: 'Test summary',
            playbook_id: '',
        });
        const runWithoutType = {...apiRun} as Record<string, unknown>;
        delete runWithoutType.type;
        props.playbookRun = runWithoutType as unknown as PlaybookRunModel;
        const {queryByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        // StatusUpdateIndicator should not be rendered for ChannelChecklistType
        expect(queryByTestId('status-update-indicator')).toBeNull();
    });

    it('renders edit icon when not read only', () => {
        const props = getBaseProps();
        props.participants.push(TestHelper.fakeUserModel({id: props.currentUserId}));
        const {getByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        const editIcon = getByTestId('playbook-run.edit-icon');
        expect(editIcon).toBeTruthy();
    });

    it('does not render edit icon when read only', () => {
        const props = getBaseProps();
        const {queryByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        const editIcon = queryByTestId('playbook-run.edit-icon');
        expect(editIcon).toBeNull();
    });

    it('handles edit icon press', () => {
        const props = getBaseProps();
        props.participants.push(TestHelper.fakeUserModel({id: props.currentUserId}));
        const {getByTestId} = renderWithEverything(<PlaybookRun {...props}/>, {database});

        const editIcon = getByTestId('playbook-run.edit-icon');
        act(() => {
            fireEvent.press(editIcon);
        });
        expect(goToEditPlaybookRun).toHaveBeenCalledWith(
            expect.anything(), // intl
            expect.anything(), // theme
            'Test Playbook Run',
            'Test summary',
            props.playbookRun!.id,
        );
    });
});

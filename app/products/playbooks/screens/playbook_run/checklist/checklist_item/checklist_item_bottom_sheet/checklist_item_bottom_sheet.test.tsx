// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {act, fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';
import {ScrollView} from 'react-native';

import OptionBox from '@components/option_box';
import OptionItem from '@components/option_item';
import {useIsTablet} from '@hooks/device';
import {setChecklistItemCommand} from '@playbooks/actions/remote/checklist';
import {dismissBottomSheet, goToScreen, openUserProfileModal} from '@screens/navigation';
import {renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChecklistItemBottomSheet from './checklist_item_bottom_sheet';

import type EditCommand from '@playbooks/screens/edit_command';

jest.mock('@hooks/device', () => ({
    useIsTablet: jest.fn(),
}));

jest.mock('@gorhom/bottom-sheet', () => ({
    BottomSheetScrollView: jest.fn(),
}));
jest.mocked(BottomSheetScrollView).mockImplementation((props: any) => <ScrollView {...props}/>); // casting to any to avoid type errors

jest.mock('@components/option_box');
jest.mocked(OptionBox).mockImplementation((props) => React.createElement('OptionBox', props));

jest.mock('@components/option_item');
jest.mocked(OptionItem).mockImplementation((props) => React.createElement('OptionItem', props));

jest.mock('@playbooks/actions/remote/checklist');

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn().mockReturnValue('server-url'),
}));

describe('ChecklistItemBottomSheet', () => {
    const mockOnCheck = jest.fn();
    const mockOnSkip = jest.fn();
    const mockOnRunCommand = jest.fn();
    const mockTeammateNameDisplay = 'username';

    const mockAssignee = TestHelper.fakeUserModel({
        id: 'user-1',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
    });

    const mockItem = TestHelper.fakePlaybookChecklistItemModel({
        id: 'item-1',
        title: 'Test Checklist Item',
        description: 'This is a test description',
        state: '',
        command: 'test command',
        dueDate: 0,
        commandLastRun: 0,
    });

    const mockApiItem = TestHelper.fakePlaybookChecklistItem('checklistId', {
        id: 'item-2',
        title: 'API Checklist Item',
        description: 'This is an API item description',
        state: 'closed',
        command: 'api command',
        due_date: 1640995200000, // 2022-01-01
        command_last_run: 1640995200000,
    });

    function getBaseProps(): ComponentProps<typeof ChecklistItemBottomSheet> {
        return {
            runId: 'run-1',
            checklistNumber: 1,
            itemNumber: 1,
            channelId: 'channel-1',
            item: mockItem,
            assignee: mockAssignee,
            onCheck: mockOnCheck,
            onSkip: mockOnSkip,
            onRunCommand: mockOnRunCommand,
            teammateNameDisplay: mockTeammateNameDisplay,
            isDisabled: false,
        };
    }

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(useIsTablet).mockReturnValue(false);
    });

    it('renders correctly with all props', () => {
        const props = getBaseProps();
        const {getByTestId, getByText} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        expect(getByText('Test Checklist Item')).toBeVisible();
        expect(getByText('This is a test description')).toBeVisible();
        expect(getByTestId('checklist_item.check_button')).toBeVisible();
        expect(getByTestId('checklist_item.skip_button')).toBeVisible();
        expect(getByTestId('checklist_item.run_command_button')).toBeVisible();
        expect(getByTestId('checklist_item.assignee')).toBeVisible();
        expect(getByTestId('checklist_item.due_date')).toBeVisible();
        expect(getByTestId('checklist_item.command')).toBeVisible();
    });

    it('renders correctly without description', () => {
        const props = getBaseProps();
        props.item.description = '';
        const {getByText, queryByText} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        expect(getByText('Test Checklist Item')).toBeVisible();
        expect(queryByText('This is a test description')).toBeNull();
    });

    it('renders correctly without assignee', () => {
        const props = getBaseProps();
        props.assignee = undefined;
        const {getByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        const assigneeOption = getByTestId('checklist_item.assignee');
        expect(assigneeOption.props.info).toBe('None');
    });

    it('renders correctly with API item type', () => {
        const props = getBaseProps();
        props.item = mockApiItem;
        const {getByText, getByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        expect(getByText('API Checklist Item')).toBeVisible();
        expect(getByText('This is an API item description')).toBeVisible();
        expect(getByTestId('checklist_item.check_button')).toBeVisible();
        expect(getByTestId('checklist_item.skip_button')).toBeVisible();
        expect(getByTestId('checklist_item.run_command_button')).toBeVisible();
        expect(getByTestId('checklist_item.assignee')).toBeVisible();
        expect(getByTestId('checklist_item.due_date')).toBeVisible();
        expect(getByTestId('checklist_item.command')).toBeVisible();
    });

    it('handles check action correctly', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        const checkButton = getByTestId('checklist_item.check_button');

        await act(async () => {
            fireEvent.press(checkButton);
        });

        expect(mockOnCheck).toHaveBeenCalledTimes(1);
        expect(dismissBottomSheet).toHaveBeenCalledTimes(1);
    });

    it('handles skip action correctly', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        const skipButton = getByTestId('checklist_item.skip_button');

        await act(async () => {
            fireEvent.press(skipButton);
        });

        expect(mockOnSkip).toHaveBeenCalledTimes(1);
        expect(dismissBottomSheet).toHaveBeenCalledTimes(1);
    });

    it('handles run command action correctly', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        const runCommandButton = getByTestId('checklist_item.run_command_button');

        await act(async () => {
            fireEvent.press(runCommandButton);
        });

        expect(mockOnRunCommand).toHaveBeenCalledTimes(1);
        expect(dismissBottomSheet).toHaveBeenCalledTimes(1);
    });

    it('displays correct button states for checked item', () => {
        const props = getBaseProps();
        props.item = TestHelper.fakePlaybookChecklistItemModel({
            ...props.item,
            state: 'closed',
        });
        const {getByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        const checkButton = getByTestId('checklist_item.check_button');
        const skipButton = getByTestId('checklist_item.skip_button');
        const runCommandButton = getByTestId('checklist_item.run_command_button');

        expect(checkButton.props.isActive).toBe(true);
        expect(skipButton.props.isActive).toBe(false);
        expect(runCommandButton.props.isActive).toBe(false);
    });

    it('displays correct button states for skipped item', () => {
        const props = getBaseProps();
        props.item = TestHelper.fakePlaybookChecklistItemModel({
            ...props.item,
            state: 'skipped',
        });
        const {getByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        const checkButton = getByTestId('checklist_item.check_button');
        const skipButton = getByTestId('checklist_item.skip_button');
        const runCommandButton = getByTestId('checklist_item.run_command_button');

        expect(checkButton.props.isActive).toBe(false);
        expect(skipButton.props.isActive).toBe(true);
        expect(runCommandButton.props.isActive).toBe(false);
    });

    it('displays correct button states for command run item', () => {
        const props = getBaseProps();
        props.item = TestHelper.fakePlaybookChecklistItemModel({
            ...props.item,
            commandLastRun: Date.now(),
        });
        const {getByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        const checkButton = getByTestId('checklist_item.check_button');
        const skipButton = getByTestId('checklist_item.skip_button');
        const runCommandButton = getByTestId('checklist_item.run_command_button');

        expect(checkButton.props.isActive).toBe(false);
        expect(skipButton.props.isActive).toBe(false);
        expect(runCommandButton.props.isActive).toBe(true);
    });

    it('displays correct button states for API item with command run', () => {
        const props = getBaseProps();
        props.item = mockApiItem;
        const {getByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        const checkButton = getByTestId('checklist_item.check_button');
        const skipButton = getByTestId('checklist_item.skip_button');
        const runCommandButton = getByTestId('checklist_item.run_command_button');

        expect(checkButton.props.isActive).toBe(true); // state is 'closed'
        expect(skipButton.props.isActive).toBe(false);
        expect(runCommandButton.props.isActive).toBe(true); // command_last_run exists
    });

    it('displays correct assignee information', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        const assigneeItem = getByTestId('checklist_item.assignee');
        expect(assigneeItem.props.info).toEqual({
            user: mockAssignee,
            onPress: expect.any(Function),
            teammateNameDisplay: mockTeammateNameDisplay,
            location: 'PlaybookRun',
        });
    });

    it('displays correct due date information', () => {
        const props = getBaseProps();
        props.item = TestHelper.fakePlaybookChecklistItemModel({
            ...props.item,
            dueDate: 1640995200000, // 2022-01-01
        });
        const {getByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        const dueDateItem = getByTestId('checklist_item.due_date');
        expect(dueDateItem.props.info).toBe('Saturday, January 1');
    });

    it('displays correct due date when within a day', () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2022-01-01').getTime());
        const props = getBaseProps();
        props.item = TestHelper.fakePlaybookChecklistItemModel({
            ...props.item,
            dueDate: 1640995200000, // 2022-01-01
        });
        const {getByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        const dueDateItem = getByTestId('checklist_item.due_date');
        expect(dueDateItem.props.info).toBe('Saturday, January 1 at 12:00 AM');

        jest.useRealTimers();
    });

    it('displays "None" for due date when no due date is set', () => {
        const props = getBaseProps();
        props.item = TestHelper.fakePlaybookChecklistItemModel({
            ...props.item,
            dueDate: 0,
        });
        const {getByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        const dueDateItem = getByTestId('checklist_item.due_date');
        expect(dueDateItem.props.info).toBe('None');
    });

    it('command is disabled when isDisabled is true', () => {
        const props = getBaseProps();
        props.isDisabled = true;
        props.item = TestHelper.fakePlaybookChecklistItemModel({
            ...props.item,
            command: 'test command',
        });
        const {getByTestId, rerender} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        let commandItem = getByTestId('checklist_item.command');
        expect(commandItem).toHaveProp('type', 'none');
        expect(commandItem).toHaveProp('action', undefined);

        props.isDisabled = false;
        rerender(<ChecklistItemBottomSheet {...props}/>);

        commandItem = getByTestId('checklist_item.command');
        expect(commandItem).toHaveProp('type', 'arrow');
        expect(commandItem).toHaveProp('action', expect.any(Function));
    });

    it('displays correct command information', () => {
        const props = getBaseProps();
        props.item = TestHelper.fakePlaybookChecklistItemModel({
            ...props.item,
            command: 'test command',
        });
        const {getByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        const commandItem = getByTestId('checklist_item.command');
        expect(commandItem.props.info).toBe('test command');
    });

    it('displays "None" for command when no command is set', () => {
        const props = getBaseProps();
        props.item = TestHelper.fakePlaybookChecklistItemModel({
            ...props.item,
            command: null,
        });
        const {getByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        const commandItem = getByTestId('checklist_item.command');
        expect(commandItem.props.info).toBe('None');
    });

    it('opens the command modal when the command is clicked', async () => {
        const props = getBaseProps();
        props.checklistNumber = 2;
        props.itemNumber = 4;
        const {getByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);
        const commandItem = getByTestId('checklist_item.command');

        act(() => {
            commandItem.props.action();
        });

        expect(goToScreen).toHaveBeenCalledWith(
            'PlaybookEditCommand',
            'Slash command',
            {
                savedCommand: 'test command',
                updateCommand: expect.any(Function),
                channelId: 'channel-1',
            },
        );

        const updateCommand = (jest.mocked(goToScreen).mock.calls[0][2] as ComponentProps<typeof EditCommand>).updateCommand;
        await act(async () => {
            updateCommand('new command');
        });

        expect(setChecklistItemCommand).toHaveBeenCalledWith(
            'server-url',
            'run-1',
            'item-1',
            2,
            4,
            'new command',
        );
    });

    it('handles user profile modal opening correctly', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        const assigneeItem = getByTestId('checklist_item.assignee');
        const onPress = assigneeItem.props.info.onPress;

        await act(async () => {
            onPress('user-1');
        });

        expect(openUserProfileModal).toHaveBeenCalledWith(
            expect.anything(), // intl
            expect.anything(), // theme
            {
                userId: 'user-1',
                location: 'PlaybookRun',
            },
        );
    });

    it('displays correct assignee label and icon', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        const assigneeItem = getByTestId('checklist_item.assignee');
        expect(assigneeItem.props.label).toBe('Assignee');
        expect(assigneeItem.props.icon).toBe('account-multiple-plus-outline');
    });

    it('displays correct due date label and icon', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        const dueDateItem = getByTestId('checklist_item.due_date');
        expect(dueDateItem.props.label).toBe('Due date');
        expect(dueDateItem.props.icon).toBe('calendar-outline');
    });

    it('displays correct command label and icon', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        const commandItem = getByTestId('checklist_item.command');
        expect(commandItem.props.label).toBe('Command');
        expect(commandItem.props.icon).toBe('slash-forward');
    });

    it('displays correct button icons', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        const checkButton = getByTestId('checklist_item.check_button');
        const skipButton = getByTestId('checklist_item.skip_button');
        const runCommandButton = getByTestId('checklist_item.run_command_button');

        expect(checkButton.props.iconName).toBe('check');
        expect(skipButton.props.iconName).toBe('close');
        expect(runCommandButton.props.iconName).toBe('slash-forward');
    });

    it('does not render action buttons when isDisabled is true', () => {
        const props = getBaseProps();
        props.isDisabled = true;
        const {queryByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        expect(queryByTestId('checklist_item.check_button')).toBeNull();
        expect(queryByTestId('checklist_item.skip_button')).toBeNull();
        expect(queryByTestId('checklist_item.run_command_button')).toBeNull();
    });

    it('does not render command when command is undefined', () => {
        const props = getBaseProps();
        props.item = TestHelper.fakePlaybookChecklistItemModel({
            ...props.item,
            command: undefined,
        });
        const {queryByTestId} = renderWithIntl(<ChecklistItemBottomSheet {...props}/>);

        expect(queryByTestId('checklist_item.run_command_button')).toBeNull();
    });
});

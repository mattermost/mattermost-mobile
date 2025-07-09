// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, waitFor} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import BaseChip from '@components/chips/base_chip';
import UserChip from '@components/chips/user_chip';
import {Preferences} from '@constants';
import {useServerUrl} from '@context/server';
import {runChecklistItem, updateChecklistItem} from '@playbooks/actions/remote/checklist';
import {openUserProfileModal, popTo} from '@screens/navigation';
import {renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {showPlaybookErrorSnackbar} from '@utils/snack_bar';

import Checkbox from './checkbox';
import ChecklistItem from './checklist_item';

const serverUrl = 'some.server.url';
jest.mock('@context/server');
jest.mocked(useServerUrl).mockReturnValue(serverUrl);

jest.mock('./checkbox');
jest.mocked(Checkbox).mockImplementation((props) => React.createElement('Checkbox', {...props, testID: 'checkbox-component'}));

jest.mock('@components/chips/user_chip');
jest.mocked(UserChip).mockImplementation((props) => React.createElement('UserChip', {...props, testID: 'user-chip-component'}));

jest.mock('@components/chips/base_chip');
jest.mocked(BaseChip).mockImplementation((props) => React.createElement('BaseChip', {...props, testID: 'base-chip-component'}));

jest.mock('@playbooks/actions/remote/checklist');
jest.mock('@utils/snack_bar');

describe('ChecklistItem', () => {
    const mockItem = TestHelper.fakePlaybookChecklistItemModel({
        id: 'item-1',
        title: 'Test Item',
        description: 'Test Description',
        state: '',
    });

    const mockAssignee = TestHelper.fakeUserModel({
        id: 'user-1',
        username: 'testuser',
    });

    function getBaseProps(): ComponentProps<typeof ChecklistItem> {
        return {
            item: mockItem,
            assignee: mockAssignee,
            teammateNameDisplay: 'username',
            channelId: 'channel-id-1',
            checklistNumber: 0,
            itemNumber: 0,
            playbookRunId: 'run-id-1',
            isDisabled: false,
        };
    }

    it('renders the correct checkbox', async () => {
        const props = getBaseProps();
        props.isDisabled = true;

        const {getByTestId, queryByTestId, rerender} = renderWithIntl(<ChecklistItem {...props}/>);

        expect(queryByTestId('checklist-item-loading')).toBeNull();
        let checkbox = getByTestId('checkbox-component');
        expect(checkbox.props.checked).toBe(false);
        expect(checkbox.props.disabled).toBe(true);

        props.item.state = 'closed';

        rerender(<ChecklistItem {...props}/>);

        checkbox = getByTestId('checkbox-component');
        expect(checkbox.props.checked).toBe(true);
        expect(checkbox.props.disabled).toBe(true);

        props.isDisabled = false;
        props.item.state = 'skipped';

        rerender(<ChecklistItem {...props}/>);

        checkbox = getByTestId('checkbox-component');
        expect(checkbox.props.checked).toBe(false);
        expect(checkbox.props.disabled).toBe(true);

        props.item.state = '';

        rerender(<ChecklistItem {...props}/>);

        checkbox = getByTestId('checkbox-component');
        expect(checkbox.props.checked).toBe(false);
        expect(checkbox.props.disabled).toBe(false);

        let resolve: (value: {data: boolean}) => void;
        jest.mocked(updateChecklistItem).mockImplementation(() => new Promise((r) => {
            resolve = r;
        }));

        act(() => {
            checkbox.props.onPress();
        });

        await waitFor(() => {
            expect(getByTestId('checklist-item-loading')).toBeVisible();
            expect(queryByTestId('checkbox-component')).toBeNull();
        });

        act(() => {
            resolve({data: true});
        });

        await waitFor(() => {
            expect(queryByTestId('checklist-item-loading')).toBeNull();
            expect(queryByTestId('checkbox-component')).toBeVisible();
        });
    });

    it('calls the correct function when the checkbox is pressed', async () => {
        const props = getBaseProps();
        props.item.state = '';

        const {getByTestId, rerender} = renderWithIntl(<ChecklistItem {...props}/>);

        let checkbox = getByTestId('checkbox-component');
        jest.mocked(updateChecklistItem).mockResolvedValue({data: true});

        act(() => {
            checkbox.props.onPress();
        });

        await waitFor(() => {
            expect(updateChecklistItem).toHaveBeenCalledWith(serverUrl, props.playbookRunId, props.item.id, props.checklistNumber, props.itemNumber, 'closed');
        });

        props.checklistNumber = 3;
        props.itemNumber = 5;
        props.item.state = 'closed';

        rerender(<ChecklistItem {...props}/>);

        checkbox = getByTestId('checkbox-component');
        act(() => {
            checkbox.props.onPress();
        });

        await waitFor(() => {
            expect(updateChecklistItem).toHaveBeenCalledWith(serverUrl, props.playbookRunId, props.item.id, props.checklistNumber, props.itemNumber, '');
        });
    });

    it('shows snackbar when checklist item fails to toggle', async () => {
        const props = getBaseProps();
        props.item.state = '';

        const {getByTestId} = renderWithIntl(<ChecklistItem {...props}/>);

        const checkbox = getByTestId('checkbox-component');
        jest.mocked(updateChecklistItem).mockResolvedValue({error: 'error'});

        act(() => {
            checkbox.props.onPress();
        });

        await waitFor(() => {
            expect(showPlaybookErrorSnackbar).toHaveBeenCalled();
        });
    });

    it('renders item title and description', () => {
        const {getByText} = renderWithIntl(<ChecklistItem {...getBaseProps()}/>);

        expect(getByText('Test Item')).toBeVisible();
        expect(getByText('Test Description')).toBeVisible();
    });

    it('renders assignee chip when assignee is provided', () => {
        const props = getBaseProps();
        props.assignee = undefined;

        const {getByTestId, queryByTestId, rerender} = renderWithIntl(<ChecklistItem {...props}/>);

        expect(queryByTestId('user-chip-component')).toBeNull();

        props.assignee = mockAssignee;

        rerender(<ChecklistItem {...props}/>);

        const userChip = getByTestId('user-chip-component');
        expect(userChip.props.user).toBe(mockAssignee);
        expect(userChip.props.onPress).toBeDefined();
        expect(userChip.props.teammateNameDisplay).toBe(props.teammateNameDisplay);

        userChip.props.onPress(props.assignee.id);
        expect(openUserProfileModal).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
            userId: props.assignee.id,
            channelId: props.channelId,
            location: 'PlaybookRun',
        });

        const differentAssignee = TestHelper.fakeUserModel({
            id: 'user-2',
            username: 'differentuser',
        });

        props.assignee = differentAssignee;
        props.teammateNameDisplay = 'differentValue';
        props.channelId = 'channel-id-2';

        rerender(<ChecklistItem {...props}/>);

        const differentUserChip = getByTestId('user-chip-component');
        expect(differentUserChip.props.user).toBe(differentAssignee);
        expect(differentUserChip.props.onPress).toBeDefined();
        expect(differentUserChip.props.teammateNameDisplay).toBe(props.teammateNameDisplay);

        differentUserChip.props.onPress(props.assignee.id);
        expect(openUserProfileModal).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
            userId: props.assignee.id,
            channelId: props.channelId,
            location: 'PlaybookRun',
        });
    });

    it('renders due date chip when due date is provided', () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-01-01').getTime());

        const props = getBaseProps();
        const item = TestHelper.fakePlaybookChecklistItemModel({});
        item.dueDate = new Date('2025-01-02').getTime();
        item.command = ''; // We remove the command to avoid several chips with the same test ID

        props.item = item;

        const {getByTestId, rerender, queryByTestId} = renderWithIntl(<ChecklistItem {...props}/>);
        let chip = getByTestId('base-chip-component');
        expect(chip).toBeVisible();
        expect(chip.props.label).toBe('Due Tomorrow');
        expect(chip.props.type).toBe('normal');
        expect(chip.props.boldText).toBe(false);
        expect(chip.props.prefix).toBeDefined();
        expect(chip.props.prefix.props.name).toBe('calendar-outline');
        expect(chip.props.prefix.props.size).toBe(14);
        expect(chip.props.prefix.props.style).toBeDefined();

        item.dueDate = new Date('2025-01-01').setHours(11);
        rerender(<ChecklistItem {...props}/>);
        chip = getByTestId('base-chip-component');
        expect(chip).toBeVisible();
        expect(chip.props.label).toBe('Due in 11 hours');
        expect(chip.props.type).toBe('danger');
        expect(chip.props.boldText).toBe(false);
        expect(chip.props.prefix).toBeDefined();
        expect(chip.props.prefix.props.name).toBe('calendar-outline');
        expect(chip.props.prefix.props.size).toBe(14);
        expect(chip.props.prefix.props.style).toBeDefined();

        item.dueDate = new Date('2024-01-01').getTime();
        rerender(<ChecklistItem {...props}/>);
        chip = getByTestId('base-chip-component');
        expect(chip).toBeVisible();
        expect(chip.props.label).toBe('Due 1 year ago');
        expect(chip.props.type).toBe('danger');
        expect(chip.props.boldText).toBe(true);
        expect(chip.props.prefix).toBeDefined();
        expect(chip.props.prefix.props.name).toBe('calendar-outline');
        expect(chip.props.prefix.props.size).toBe(14);
        expect(chip.props.prefix.props.style).toBeDefined();

        item.dueDate = 0;
        rerender(<ChecklistItem {...props}/>);
        jest.useRealTimers();

        expect(queryByTestId('base-chip-component')).toBeNull();
    });

    it('renders command chip when command is provided', async () => {
        const props = getBaseProps();
        const item = TestHelper.fakePlaybookChecklistItemModel({});
        item.command = '';
        item.dueDate = 0; // We remove the due date to avoid several chips with the same test ID
        props.item = item;

        const {getByTestId, queryByTestId, rerender} = renderWithIntl(<ChecklistItem {...props}/>);
        expect(queryByTestId('base-chip-component')).toBeNull();

        item.command = '/test-command';
        rerender(<ChecklistItem {...props}/>);
        const chip = getByTestId('base-chip-component');
        expect(chip).toBeVisible();
        expect(chip.props.label).toBe('test-command');
        expect(chip.props.type).toBe('link');
        expect(chip.props.prefix).toBeDefined();
        expect(chip.props.prefix.props.name).toBe('slash-forward');
        expect(chip.props.prefix.props.style).toBeDefined();

        let resolve: (value: {data: boolean}) => void;
        jest.mocked(runChecklistItem).mockImplementation(() => new Promise((r) => {
            resolve = r;
        }));

        act(() => {
            chip.props.onPress();
        });

        await waitFor(() => {
            expect(chip.props.prefix.type.displayName).toBe('ActivityIndicator');
            expect(chip.props.prefix.props.size).toBe('small');
            expect(chip.props.prefix.props.color).toBe(Preferences.THEMES.denim.centerChannelColor);
            expect(runChecklistItem).toHaveBeenCalledWith(serverUrl, props.playbookRunId, props.checklistNumber, props.itemNumber);
        });

        act(() => {
            resolve({data: true});
        });

        await waitFor(() => {
            expect(getByTestId('base-chip-component')).toBeVisible();
            expect(popTo).toHaveBeenCalledWith('Channel');
        });
    });

    it('shows snackbar when checklist item command fails to execute', async () => {
        const props = getBaseProps();
        const item = TestHelper.fakePlaybookChecklistItemModel({});
        item.command = '/test-command';
        item.dueDate = 0; // We remove the due date to avoid several chips with the same test ID
        props.item = item;

        const {getByTestId} = renderWithIntl(<ChecklistItem {...props}/>);

        const chip = getByTestId('base-chip-component');
        jest.mocked(runChecklistItem).mockResolvedValue({error: 'error'});

        act(() => {
            chip.props.onPress();
        });

        await waitFor(() => {
            expect(showPlaybookErrorSnackbar).toHaveBeenCalled();
            expect(popTo).not.toHaveBeenCalled();
        });
    });
});

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, waitFor, within} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import Button from '@components/button';
import {useServerUrl} from '@context/server';
import {addChecklistItem} from '@playbooks/actions/remote/checklist';
import ProgressBar from '@playbooks/components/progress_bar';
import {goToAddChecklistItem} from '@playbooks/screens/navigation';
import {DEFAULT_TASK_FILTERS} from '@playbooks/utils/task_filters';
import {renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {logError} from '@utils/log';
import {showPlaybookErrorSnackbar} from '@utils/snack_bar';

import Checklist from './checklist';
import ChecklistItem from './checklist_item';

import type {ReactTestInstance} from 'react-test-renderer';

const serverUrl = 'test-server-url';

jest.mock('@context/server');
jest.mocked(useServerUrl).mockReturnValue(serverUrl);

jest.mock('@components/compass_icon', () => ({
    __esModule: true,
    default: jest.fn(),
}));
const CompassIcon = require('@components/compass_icon').default;
jest.mocked(CompassIcon).mockImplementation(
    (props: any) => React.createElement('CompassIcon', {testID: 'compass-icon', ...props}) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
);

jest.mock('./checklist_item');
jest.mocked(ChecklistItem).mockImplementation(
    (props: ComponentProps<typeof ChecklistItem>) => React.createElement('ChecklistItem', {testID: 'checklist-item', ...props}),
);

jest.mock('@playbooks/components/progress_bar');
jest.mocked(ProgressBar).mockImplementation(
    (props) => React.createElement('ProgressBar', {testID: 'progress-bar-component', ...props}),
);

jest.mock('@components/button', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(Button).mockImplementation(
    (props) => React.createElement('Button', {testID: props.testID, ...props}),
);

jest.mock('@playbooks/screens/navigation', () => ({
    goToRenameChecklist: jest.fn(),
    goToAddChecklistItem: jest.fn(),
}));

jest.mock('@playbooks/actions/remote/checklist', () => ({
    renameChecklist: jest.fn(),
    addChecklistItem: jest.fn(),
}));

jest.mock('@utils/snack_bar', () => ({
    showPlaybookErrorSnackbar: jest.fn(),
}));

describe('Checklist', () => {
    const mockChecklist = TestHelper.fakePlaybookChecklistModel({
        id: 'checklist-1',
        title: 'Test Checklist',
    });

    const mockItems = [
        TestHelper.fakePlaybookChecklistItemModel({
            id: 'item-1',
            title: 'Item 1',
            state: '',
        }),
        TestHelper.fakePlaybookChecklistItemModel({
            id: 'item-2',
            title: 'Item 2',
            state: 'closed',
        }),
    ];

    function getBaseProps(): ComponentProps<typeof Checklist> {
        return {
            checklist: mockChecklist,
            checklistNumber: 0,
            items: mockItems,
            channelId: 'channel-id-1',
            playbookRunId: 'run-id-1',
            playbookRunName: 'Test Run',
            isFinished: false,
            isParticipant: true,
            filters: DEFAULT_TASK_FILTERS,
            currentUserId: 'current-user-id',
            collapseAll: false,
            collapseAllEpoch: 0,
            checklistProgress: {
                skipped: false,
                completed: 0,
                totalNumber: 0,
                progress: 0,
            },
        };
    }

    it('renders checklist header correctly', () => {
        const props = getBaseProps();
        props.checklistProgress.completed = 1;
        props.checklistProgress.totalNumber = 2;

        const {getByText} = renderWithIntl(<Checklist {...props}/>);

        expect(getByText('Test Checklist')).toBeTruthy();
        expect(getByText('1 / 2 done')).toBeTruthy();
    });

    it('toggles expanded state on header press', async () => {
        const props = getBaseProps();
        const {getByText, getByTestId} = renderWithIntl(<Checklist {...props}/>);

        const header = getByText('Test Checklist');

        // Initially expanded
        await waitFor(() => {
            expect(getByTestId('checklist-items-container')).toHaveAnimatedStyle({paddingVertical: 16});
        });

        // Toggle to collapsed
        act(() => {
            fireEvent.press(header);
        });

        // Should still be rendered but with different height
        await waitFor(() => {
            expect(getByTestId('checklist-items-container')).toHaveAnimatedStyle({paddingVertical: 0});
        });

        // Toggle back to expanded
        act(() => {
            fireEvent.press(header);
        });

        await waitFor(() => {
            expect(getByTestId('checklist-items-container')).toHaveAnimatedStyle({paddingVertical: 16});
        });
    });

    it('shows correct progress for completed and skippeditems', () => {
        const props = getBaseProps();
        props.checklistProgress.completed = 2;
        props.checklistProgress.totalNumber = 2;

        const {getByText, rerender} = renderWithIntl(<Checklist {...props}/>);

        expect(getByText('2 / 2 done')).toBeTruthy();

        props.checklistProgress.completed = 1;
        props.checklistProgress.totalNumber = 2;

        rerender(<Checklist {...props}/>);

        expect(getByText('1 / 2 done')).toBeTruthy();
    });

    it('renders items correctly', () => {
        const props = getBaseProps();
        props.isFinished = false;
        props.isParticipant = true;

        const {getByTestId, rerender} = renderWithIntl(<Checklist {...props}/>);

        let items = within(getByTestId('checklist-items-container')).getAllByTestId('checklist-item');
        expect(items).toHaveLength(2);
        expect(items[0].props.item).toBe(props.items[0]);
        expect(items[0].props.channelId).toBe(props.channelId);
        expect(items[0].props.checklistNumber).toBe(props.checklistNumber);
        expect(items[0].props.playbookRunId).toBe(props.playbookRunId);
        expect(items[0].props.itemNumber).toBe(0);
        expect(items[0].props.isDisabled).toBe(false);

        expect(items[1].props.item).toBe(props.items[1]);
        expect(items[1].props.channelId).toBe(props.channelId);
        expect(items[1].props.checklistNumber).toBe(props.checklistNumber);
        expect(items[1].props.playbookRunId).toBe(props.playbookRunId);
        expect(items[1].props.itemNumber).toBe(1);
        expect(items[1].props.isDisabled).toBe(false);

        props.isFinished = true;
        props.channelId = 'other-channel-id';
        props.checklistNumber = 2;
        props.playbookRunId = 'other-run-id';

        rerender(<Checklist {...props}/>);

        items = within(getByTestId('checklist-items-container')).getAllByTestId('checklist-item');
        expect(items).toHaveLength(2);
        expect(items[0].props.item).toBe(props.items[0]);
        expect(items[0].props.channelId).toBe(props.channelId);
        expect(items[0].props.checklistNumber).toBe(props.checklistNumber);
        expect(items[0].props.playbookRunId).toBe(props.playbookRunId);
        expect(items[0].props.itemNumber).toBe(0);
        expect(items[0].props.isDisabled).toBe(true);

        expect(items[1].props.item).toBe(props.items[1]);
        expect(items[1].props.channelId).toBe(props.channelId);
        expect(items[1].props.checklistNumber).toBe(props.checklistNumber);
        expect(items[1].props.playbookRunId).toBe(props.playbookRunId);
        expect(items[1].props.itemNumber).toBe(1);
        expect(items[1].props.isDisabled).toBe(true);

        props.isParticipant = false;
        rerender(<Checklist {...props}/>);

        items = within(getByTestId('checklist-items-container')).getAllByTestId('checklist-item');
        expect(items).toHaveLength(2);
        expect(items[0].props.item).toBe(props.items[0]);
        expect(items[0].props.channelId).toBe(props.channelId);
        expect(items[0].props.checklistNumber).toBe(props.checklistNumber);
        expect(items[0].props.playbookRunId).toBe(props.playbookRunId);
        expect(items[0].props.itemNumber).toBe(0);
        expect(items[0].props.isDisabled).toBe(true);

        expect(items[1].props.item).toBe(props.items[1]);
        expect(items[1].props.channelId).toBe(props.channelId);
        expect(items[1].props.checklistNumber).toBe(props.checklistNumber);
        expect(items[1].props.playbookRunId).toBe(props.playbookRunId);
        expect(items[1].props.itemNumber).toBe(1);
        expect(items[1].props.isDisabled).toBe(true);

        props.isFinished = false;
        rerender(<Checklist {...props}/>);

        items = within(getByTestId('checklist-items-container')).getAllByTestId('checklist-item');
        expect(items).toHaveLength(2);
        expect(items[0].props.item).toBe(props.items[0]);
        expect(items[0].props.channelId).toBe(props.channelId);
        expect(items[0].props.checklistNumber).toBe(props.checklistNumber);
        expect(items[0].props.playbookRunId).toBe(props.playbookRunId);
        expect(items[0].props.itemNumber).toBe(0);
        expect(items[0].props.isDisabled).toBe(true);

        expect(items[1].props.item).toBe(props.items[1]);
        expect(items[1].props.channelId).toBe(props.channelId);
        expect(items[1].props.checklistNumber).toBe(props.checklistNumber);
        expect(items[1].props.playbookRunId).toBe(props.playbookRunId);
        expect(items[1].props.itemNumber).toBe(1);
        expect(items[1].props.isDisabled).toBe(true);
    });

    it('passes the correct props to the ProgressBar', () => {
        const props = getBaseProps();
        props.isFinished = false;
        props.checklistProgress.progress = 0;

        const {getByTestId, rerender} = renderWithIntl(<Checklist {...props}/>);

        const progressBar = getByTestId('progress-bar-component');
        expect(progressBar.props.progress).toBe(0);
        expect(progressBar.props.isActive).toBe(true);

        props.isFinished = true;
        props.checklistProgress.progress = 50;

        rerender(<Checklist {...props}/>);

        expect(progressBar.props.progress).toBe(50);
        expect(progressBar.props.isActive).toBe(false);

        props.checklistProgress.progress = 100;
        rerender(<Checklist {...props}/>);

        expect(progressBar.props.progress).toBe(100);
        expect(progressBar.props.isActive).toBe(false);
    });

    it('renders add button when not finished and is participant', () => {
        const props = getBaseProps();
        props.isFinished = false;
        props.isParticipant = true;

        const {getByTestId} = renderWithIntl(<Checklist {...props}/>);

        const addButton = getByTestId('add-checklist-item-button');
        expect(addButton).toBeTruthy();
        expect(addButton.props.text).toBe('New');
        expect(addButton.props.iconName).toBe('plus');
    });

    it('does not render add button when finished', () => {
        const props = getBaseProps();
        props.isFinished = true;
        props.isParticipant = true;

        const {queryByTestId} = renderWithIntl(<Checklist {...props}/>);

        expect(queryByTestId('add-checklist-item-button')).toBeNull();
    });

    it('does not render add button when not participant', () => {
        const props = getBaseProps();
        props.isFinished = false;
        props.isParticipant = false;

        const {queryByTestId} = renderWithIntl(<Checklist {...props}/>);

        expect(queryByTestId('add-checklist-item-button')).toBeNull();
    });

    it('calls goToAddChecklistItem when add button is pressed', () => {
        jest.mocked(goToAddChecklistItem).mockClear();
        const props = getBaseProps();
        props.isFinished = false;
        props.isParticipant = true;

        const {getByTestId} = renderWithIntl(<Checklist {...props}/>);

        const addButton = getByTestId('add-checklist-item-button');
        fireEvent.press(addButton);

        expect(goToAddChecklistItem).toHaveBeenCalled();
    });

    it('renders edit icon in header', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntl(<Checklist {...props}/>);

        const editButton = getByTestId('edit-checklist-button');
        expect(editButton).toBeTruthy();
    });

    it('toggles expanded state which affects chevron icon', async () => {
        const props = getBaseProps();
        const {getByText, getByTestId, getAllByTestId} = renderWithIntl(<Checklist {...props}/>);

        const header = getByText('Test Checklist');

        // Initially expanded - chevron should be down
        await waitFor(() => {
            expect(getByTestId('checklist-items-container')).toHaveAnimatedStyle({paddingVertical: 16});
        });
        const chevronIcons = getAllByTestId('compass-icon');
        const chevron = chevronIcons.find((icon) => icon.props.name === 'chevron-down' || icon.props.name === 'chevron-right');
        expect(chevron).toBeTruthy();
        expect(chevron?.props.name).toBe('chevron-down');

        // Toggle to collapsed - chevron should change to right
        act(() => {
            fireEvent.press(header);
        });

        await waitFor(() => {
            expect(getByTestId('checklist-items-container')).toHaveAnimatedStyle({paddingVertical: 0});
        });
        const chevronIconsCollapsed = getAllByTestId('compass-icon');
        const chevronCollapsed = chevronIconsCollapsed.find((icon) => icon.props.name === 'chevron-down' || icon.props.name === 'chevron-right');
        expect(chevronCollapsed).toBeTruthy();
        expect(chevronCollapsed?.props.name).toBe('chevron-right');

        // Toggle back to expanded - chevron should change to down
        act(() => {
            fireEvent.press(header);
        });

        await waitFor(() => {
            expect(getByTestId('checklist-items-container')).toHaveAnimatedStyle({paddingVertical: 16});
        });
        const chevronIconsExpanded = getAllByTestId('compass-icon');
        const chevronExpanded = chevronIconsExpanded.find((icon) => icon.props.name === 'chevron-down' || icon.props.name === 'chevron-right');
        expect(chevronExpanded).toBeTruthy();
        expect(chevronExpanded?.props.name).toBe('chevron-down');
    });

    it('handles add item error correctly', async () => {
        const mockError = {message: 'Add item failed'};
        jest.mocked(addChecklistItem).mockResolvedValueOnce({error: mockError} as {error: Error});
        jest.mocked(goToAddChecklistItem).mockClear();

        const props = getBaseProps();
        props.isFinished = false;
        props.isParticipant = true;

        const {getByTestId} = renderWithIntl(<Checklist {...props}/>);

        const addButton = getByTestId('add-checklist-item-button');
        act(() => {
            fireEvent.press(addButton);
        });

        const onAdd = jest.mocked(goToAddChecklistItem).mock.calls[0][1];
        await act(async () => {
            await onAdd({title: 'New Item'});
        });

        await waitFor(() => {
            expect(addChecklistItem).toHaveBeenCalledWith(
                serverUrl,
                props.playbookRunId,
                props.checklistNumber,
                {title: 'New Item'},
            );
            expect(showPlaybookErrorSnackbar).toHaveBeenCalled();
            expect(logError).toHaveBeenCalledWith('error on addChecklistItem', expect.any(String));
        });
    });

    it('handles successful add item without errors', async () => {
        jest.mocked(addChecklistItem).mockResolvedValueOnce({data: true} as {data: boolean});
        jest.mocked(goToAddChecklistItem).mockImplementation(async (playbookRunName, onAdd) => {
            onAdd({title: 'New Item'});
        });

        const props = getBaseProps();
        props.isFinished = false;
        props.isParticipant = true;

        const {getByTestId} = renderWithIntl(<Checklist {...props}/>);

        const addButton = getByTestId('add-checklist-item-button');
        act(() => {
            fireEvent.press(addButton);
        });

        await waitFor(() => {
            expect(addChecklistItem).toHaveBeenCalledWith(
                serverUrl,
                props.playbookRunId,
                props.checklistNumber,
                {title: 'New Item'},
            );
            expect(showPlaybookErrorSnackbar).not.toHaveBeenCalled();
            expect(logError).not.toHaveBeenCalled();
        });
    });

    describe('hiding items', () => {
        const renderedItems = (getByTestId: (id: string) => ReactTestInstance) =>
            within(getByTestId('checklist-items-container')).queryAllByTestId('checklist-item');

        it('should not render a hidden incomplete item, but keep the server index of the items after it', () => {
            const props = getBaseProps();
            props.items = [
                TestHelper.fakePlaybookChecklistItemModel({id: 'item-1', title: 'Item 1'}),
                TestHelper.fakePlaybookChecklistItemModel({id: 'item-2', title: 'Hidden', conditionAction: 'hidden', completedAt: 0}),
                TestHelper.fakePlaybookChecklistItemModel({id: 'item-3', title: 'Item 3'}),
            ];

            const {getByTestId} = renderWithIntl(<Checklist {...props}/>);
            const items = renderedItems(getByTestId);

            expect(items).toHaveLength(2);
            expect(items[0].props.item.id).toBe('item-1');
            expect(items[1].props.item.id).toBe('item-3');

            // item-3 is third in the checklist, so the server still knows it as index 2 even though
            // it is rendered second. Passing its rendered position instead would mutate item-2.
            expect(items[0].props.itemNumber).toBe(0);
            expect(items[1].props.itemNumber).toBe(2);
        });

        it('should render a hidden item once it has been completed', () => {
            const props = getBaseProps();
            props.items = [
                TestHelper.fakePlaybookChecklistItemModel({id: 'item-1', title: 'Item 1'}),
                TestHelper.fakePlaybookChecklistItemModel({id: 'item-2', title: 'Hidden', conditionAction: 'hidden', state: 'closed', completedAt: 123}),
            ];

            const {getByTestId} = renderWithIntl(<Checklist {...props}/>);

            expect(renderedItems(getByTestId)).toHaveLength(2);
        });
    });

    describe('task filters', () => {
        const renderedItemIds = (getByTestId: (id: string) => ReactTestInstance) =>
            within(getByTestId('checklist-items-container')).
                queryAllByTestId('checklist-item').
                map((item) => item.props.item.id);

        function getFilterProps(): ComponentProps<typeof Checklist> {
            const props = getBaseProps();
            props.currentUserId = 'me';
            props.items = [
                TestHelper.fakePlaybookChecklistItemModel({id: 'unchecked', state: ''}),
                TestHelper.fakePlaybookChecklistItemModel({id: 'checked', state: 'closed'}),
                TestHelper.fakePlaybookChecklistItemModel({id: 'skipped', state: 'skipped'}),
                TestHelper.fakePlaybookChecklistItemModel({id: 'mine', assigneeId: 'me'}),
                TestHelper.fakePlaybookChecklistItemModel({id: 'theirs', assigneeId: 'someone-else'}),
            ];
            return props;
        }

        it('should render every item with the default filters', () => {
            const {getByTestId} = renderWithIntl(<Checklist {...getFilterProps()}/>);

            expect(renderedItemIds(getByTestId)).toEqual(['unchecked', 'checked', 'skipped', 'mine', 'theirs']);
        });

        it('should hide checked items when showChecked is off', () => {
            const props = getFilterProps();
            props.filters = {...DEFAULT_TASK_FILTERS, showChecked: false};

            const {getByTestId} = renderWithIntl(<Checklist {...props}/>);

            expect(renderedItemIds(getByTestId)).not.toContain('checked');
        });

        it('should hide skipped items when showSkipped is off', () => {
            const props = getFilterProps();
            props.filters = {...DEFAULT_TASK_FILTERS, showSkipped: false};

            const {getByTestId} = renderWithIntl(<Checklist {...props}/>);

            expect(renderedItemIds(getByTestId)).not.toContain('skipped');
        });

        it('should hide items assigned to the current user when Me is off', () => {
            const props = getFilterProps();
            props.filters = {...DEFAULT_TASK_FILTERS, showAssignedToMe: false};

            const {getByTestId} = renderWithIntl(<Checklist {...props}/>);

            expect(renderedItemIds(getByTestId)).not.toContain('mine');
        });

        it('should hide items assigned to other users when Others is off', () => {
            const props = getFilterProps();
            props.filters = {...DEFAULT_TASK_FILTERS, showAssignedToOthers: false};

            const {getByTestId} = renderWithIntl(<Checklist {...props}/>);

            expect(renderedItemIds(getByTestId)).not.toContain('theirs');
        });

        it('should hide unassigned items when Unassigned is off', () => {
            const props = getFilterProps();
            props.filters = {...DEFAULT_TASK_FILTERS, showUnassigned: false};

            const {getByTestId} = renderWithIntl(<Checklist {...props}/>);

            // Only the two items that have an assignee remain.
            expect(renderedItemIds(getByTestId)).toEqual(['mine', 'theirs']);
        });

        it('should keep the server index of items that survive a filter', () => {
            const props = getFilterProps();
            props.filters = {...DEFAULT_TASK_FILTERS, showChecked: false};

            const {getByTestId} = renderWithIntl(<Checklist {...props}/>);
            const items = within(getByTestId('checklist-items-container')).queryAllByTestId('checklist-item');

            // 'checked' sits at index 1 and is filtered out; the items after it keep their own indices.
            expect(items.map((i) => i.props.itemNumber)).toEqual([0, 2, 3, 4]);
        });
    });

    describe('collapse all', () => {
        it('should collapse when the run collapses all checklists', async () => {
            const props = getBaseProps();
            const {getByTestId, rerender} = renderWithIntl(<Checklist {...props}/>);

            await waitFor(() => {
                expect(getByTestId('checklist-items-container')).toHaveAnimatedStyle({paddingVertical: 16});
            });

            rerender(
                <Checklist
                    {...props}
                    collapseAll={true}
                    collapseAllEpoch={1}
                />,
            );

            await waitFor(() => {
                expect(getByTestId('checklist-items-container')).toHaveAnimatedStyle({paddingVertical: 0});
            });
        });

        it('should re-collapse after being expanded individually', async () => {
            const props = getBaseProps();
            const {getByText, getByTestId, rerender} = renderWithIntl(<Checklist {...props}/>);

            rerender(
                <Checklist
                    {...props}
                    collapseAll={true}
                    collapseAllEpoch={1}
                />,
            );
            await waitFor(() => {
                expect(getByTestId('checklist-items-container')).toHaveAnimatedStyle({paddingVertical: 0});
            });

            // Expand this one checklist on its own.
            act(() => {
                fireEvent.press(getByText('Test Checklist'));
            });
            await waitFor(() => {
                expect(getByTestId('checklist-items-container')).toHaveAnimatedStyle({paddingVertical: 16});
            });

            // Collapsing all again must still collapse it, even though only the epoch changed.
            rerender(
                <Checklist
                    {...props}
                    collapseAll={true}
                    collapseAllEpoch={2}
                />,
            );

            await waitFor(() => {
                expect(getByTestId('checklist-items-container')).toHaveAnimatedStyle({paddingVertical: 0});
            });
        });
    });
});

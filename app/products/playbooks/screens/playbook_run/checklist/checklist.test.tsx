// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, waitFor, within} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import ProgressBar from '@playbooks/components/progress_bar';
import {renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Checklist from './checklist';
import ChecklistItem from './checklist_item';

jest.mock('./checklist_item');
jest.mocked(ChecklistItem).mockImplementation(
    (props) => React.createElement('ChecklistItem', {testID: 'checklist-item', ...props}),
);

jest.mock('@playbooks/components/progress_bar');
jest.mocked(ProgressBar).mockImplementation(
    (props) => React.createElement('ProgressBar', {testID: 'progress-bar-component', ...props}),
);

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
            isFinished: false,
            isParticipant: true,
        };
    }

    it('renders checklist header correctly', () => {
        const props = getBaseProps();
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
        props.items = [
            TestHelper.fakePlaybookChecklistItemModel({
                id: 'item-1',
                title: 'Item 1',
                state: 'closed',
            }),
            TestHelper.fakePlaybookChecklistItemModel({
                id: 'item-2',
                title: 'Item 2',
                state: 'closed',
            }),
        ];

        const {getByText, rerender} = renderWithIntl(<Checklist {...props}/>);

        expect(getByText('2 / 2 done')).toBeTruthy();

        props.items = [
            TestHelper.fakePlaybookChecklistItemModel({
                id: 'item-1',
                title: 'Item 1',
                state: 'closed',
            }),
            TestHelper.fakePlaybookChecklistItemModel({
                id: 'item-2',
                title: 'Item 2',
                state: '',
            }),
            TestHelper.fakePlaybookChecklistItemModel({
                id: 'item-3',
                title: 'Item 3',
                state: 'skipped',
            }),
        ];
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
        props.items = [
            TestHelper.fakePlaybookChecklistItemModel({
                id: 'item-1',
                title: 'Item 1',
                state: '',
            }),
            TestHelper.fakePlaybookChecklistItemModel({
                id: 'item-2',
                title: 'Item 2',
                state: '',
            }),
            TestHelper.fakePlaybookChecklistItemModel({
                id: 'item-3',
                title: 'Item 3',
                state: '',
            }),
        ];

        const {getByTestId, rerender} = renderWithIntl(<Checklist {...props}/>);

        const progressBar = getByTestId('progress-bar-component');
        expect(progressBar.props.progress).toBe(0);
        expect(progressBar.props.isActive).toBe(true);

        props.isFinished = true;
        props.items = [
            TestHelper.fakePlaybookChecklistItemModel({
                id: 'item-1',
                title: 'Item 1',
                state: 'closed',
            }),
            TestHelper.fakePlaybookChecklistItemModel({
                id: 'item-2',
                title: 'Item 2',
                state: '',
            }),
            TestHelper.fakePlaybookChecklistItemModel({
                id: 'item-3',
                title: 'Item 3',
                state: '',
            }),
        ];
        rerender(<Checklist {...props}/>);

        expect(progressBar.props.progress).toBe(33);
        expect(progressBar.props.isActive).toBe(false);

        props.items = [
            TestHelper.fakePlaybookChecklistItemModel({
                id: 'item-1',
                title: 'Item 1',
                state: 'closed',
            }),
            TestHelper.fakePlaybookChecklistItemModel({
                id: 'item-2',
                title: 'Item 2',
                state: 'skipped',
            }),
            TestHelper.fakePlaybookChecklistItemModel({
                id: 'item-3',
                title: 'Item 3',
                state: '',
            }),
        ];
        rerender(<Checklist {...props}/>);

        expect(progressBar.props.progress).toBe(50);
        expect(progressBar.props.isActive).toBe(false);

        props.items = [
            TestHelper.fakePlaybookChecklistItemModel({
                id: 'item-1',
                title: 'Item 1',
                state: 'closed',
            }),
            TestHelper.fakePlaybookChecklistItemModel({
                id: 'item-2',
                title: 'Item 2',
                state: 'skipped',
            }),
            TestHelper.fakePlaybookChecklistItemModel({
                id: 'item-3',
                title: 'Item 3',
                state: 'closed',
            }),
        ];
        rerender(<Checklist {...props}/>);

        expect(progressBar.props.progress).toBe(100);
        expect(progressBar.props.isActive).toBe(false);
    });
});

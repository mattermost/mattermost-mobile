// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';
import {act} from '@testing-library/react-native';

import {DEFAULT_TASK_FILTERS} from '@playbooks/utils/task_filters';
import {renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Checklist from './checklist';
import ChecklistList from './checklist_list';

jest.mock('./checklist');
jest.mocked(Checklist).mockImplementation(
    (props: ComponentProps<typeof Checklist>) => React.createElement('Checklist', {testID: 'checklist-component', ...props}),
);

describe('ChecklistList', () => {
    const mockChecklists = [
        TestHelper.fakePlaybookChecklistModel({
            id: 'checklist-1',
            title: 'Test Checklist',
        }),
        TestHelper.fakePlaybookChecklistModel({
            id: 'checklist-2',
            title: 'Test Checklist 2',
        }),
    ];

    function getBaseProps(): ComponentProps<typeof ChecklistList> {
        return {
            checklists: mockChecklists,
            channelId: 'channel-id-1',
            playbookRunId: 'run-id-1',
            playbookRunName: 'Test Run',
            isFinished: false,
            isParticipant: true,
            filters: DEFAULT_TASK_FILTERS,
            currentUserId: 'current-user-id',
            expandedById: {},
            onToggleChecklistExpanded: jest.fn(),
            onClearFilters: jest.fn(),
        };
    }

    it('renders checklists with correct props', () => {
        const props = getBaseProps();
        const {getAllByTestId} = renderWithIntl(<ChecklistList {...props}/>);

        const checklistComponents = getAllByTestId('checklist-component');
        expect(checklistComponents).toHaveLength(mockChecklists.length);
        expect(checklistComponents[0].props.checklist).toEqual(mockChecklists[0]);
        expect(checklistComponents[0].props.channelId).toEqual(props.channelId);
        expect(checklistComponents[0].props.playbookRunId).toEqual(props.playbookRunId);
        expect(checklistComponents[0].props.checklistNumber).toEqual(0);
        expect(checklistComponents[0].props.isFinished).toEqual(props.isFinished);
        expect(checklistComponents[0].props.isParticipant).toEqual(props.isParticipant);
        expect(checklistComponents[0].props.expanded).toBe(true);
        expect(checklistComponents[0].props.onToggleExpanded).toEqual(expect.any(Function));

        expect(checklistComponents[1].props.checklist).toEqual(mockChecklists[1]);
        expect(checklistComponents[1].props.channelId).toEqual(props.channelId);
        expect(checklistComponents[1].props.playbookRunId).toEqual(props.playbookRunId);
        expect(checklistComponents[1].props.checklistNumber).toEqual(1);
        expect(checklistComponents[1].props.isFinished).toEqual(props.isFinished);
        expect(checklistComponents[1].props.isParticipant).toEqual(props.isParticipant);
        expect(checklistComponents[1].props.expanded).toBe(true);
        expect(checklistComponents[1].props.onToggleExpanded).toEqual(expect.any(Function));
    });

    it('passes collapsed expanded state from expandedById', () => {
        const props = getBaseProps();
        props.expandedById = {
            'checklist-1': false,
            'checklist-2': true,
        };
        const {getAllByTestId} = renderWithIntl(<ChecklistList {...props}/>);

        const checklistComponents = getAllByTestId('checklist-component');
        expect(checklistComponents[0].props.expanded).toBe(false);
        expect(checklistComponents[1].props.expanded).toBe(true);
    });

    it('notifies parent when a checklist is toggled', () => {
        const props = getBaseProps();
        const {getAllByTestId} = renderWithIntl(<ChecklistList {...props}/>);

        act(() => {
            getAllByTestId('checklist-component')[0].props.onToggleExpanded();
        });

        expect(props.onToggleChecklistExpanded).toHaveBeenCalledWith('checklist-1');
    });

    it('applies opacity change when finished or not participant', () => {
        const props = getBaseProps();
        props.isFinished = false;
        props.isParticipant = true;

        const {root, rerender} = renderWithIntl(<ChecklistList {...props}/>);
        expect(root).not.toHaveStyle({opacity: 0.72});

        props.isFinished = true;
        rerender(<ChecklistList {...props}/>);
        expect(root).toHaveStyle({opacity: 0.72});

        props.isParticipant = false;
        rerender(<ChecklistList {...props}/>);
        expect(root).toHaveStyle({opacity: 0.72});

        props.isFinished = false;
        rerender(<ChecklistList {...props}/>);
        expect(root).toHaveStyle({opacity: 0.72});
    });
});

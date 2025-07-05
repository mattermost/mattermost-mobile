// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Checklist from './checklist';
import ChecklistList from './checklist_list';

jest.mock('./checklist');
jest.mocked(Checklist).mockImplementation(
    (props) => React.createElement('Checklist', {testID: 'checklist-component', ...props}),
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

    function getBaseProps() {
        return {
            checklists: mockChecklists,
            channelId: 'channel-id-1',
            playbookRunId: 'run-id-1',
            isFinished: false,
            isParticipant: true,
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

        expect(checklistComponents[1].props.checklist).toEqual(mockChecklists[1]);
        expect(checklistComponents[1].props.channelId).toEqual(props.channelId);
        expect(checklistComponents[1].props.playbookRunId).toEqual(props.playbookRunId);
        expect(checklistComponents[1].props.checklistNumber).toEqual(1);
        expect(checklistComponents[1].props.isFinished).toEqual(props.isFinished);
        expect(checklistComponents[1].props.isParticipant).toEqual(props.isParticipant);
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

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, waitFor} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import EmptyState from './empty_state';
import PlaybookCard from './playbook_card';
import PlaybookRuns from './playbook_runs';

jest.mock('./empty_state');
jest.mocked(EmptyState).mockImplementation((props) => React.createElement('EmptyState', {...props, testID: 'empty-state'}));

jest.mock('./playbook_card');
jest.mocked(PlaybookCard).mockImplementation((props) => React.createElement('PlaybookCard', {...props, testID: 'playbook-card'}));

describe('PlaybookRuns', () => {
    const inProgressRun = TestHelper.fakePlaybookRunModel({
        name: 'In Progress Run',
        currentStatus: 'InProgress',
    });

    const finishedRun = TestHelper.fakePlaybookRunModel({
        name: 'Finished Run',
        currentStatus: 'Finished',
    });

    it('shows empty state when no runs in selected tab', () => {
        const {getByTestId} = renderWithIntl(
            <PlaybookRuns
                allRuns={[]}
                componentId={'PlaybookRuns'}
                channelId={'channel-id-1'}
            />,
        );

        const emptyState = getByTestId('empty-state');
        expect(emptyState).toBeTruthy();
        expect(emptyState.props.tab).toBe('finished');
    });

    it('switches between tabs correctly', async () => {
        const {getByText, getByTestId} = renderWithIntl(
            <PlaybookRuns
                allRuns={[inProgressRun, finishedRun]}
                componentId={'PlaybookRuns'}
                channelId={'channel-id-1'}
            />,
        );

        let card = getByTestId('playbook-card');
        expect(card.props.run).toBe(inProgressRun);

        // Switch to finished tab
        act(() => {
            fireEvent.press(getByText('Finished'));
        });

        await waitFor(() => {
            card = getByTestId('playbook-card');
            expect(card.props.run).toBe(finishedRun);
        });
    });

    it('should default to finished tab if no in-progress runs', () => {
        const {getByText, getByTestId, queryByTestId} = renderWithIntl(
            <PlaybookRuns
                allRuns={[finishedRun]}
                componentId={'PlaybookRuns'}
                channelId={'channel-id-1'}
            />,
        );

        const card = getByTestId('playbook-card');
        expect(card.props.run).toBe(finishedRun);

        // Switch to in-progress tab
        act(() => {
            fireEvent.press(getByText('In Progress'));
        });

        expect(queryByTestId('playbook-card')).toBeNull();
        expect(getByTestId('empty-state')).toBeTruthy();
    });
});

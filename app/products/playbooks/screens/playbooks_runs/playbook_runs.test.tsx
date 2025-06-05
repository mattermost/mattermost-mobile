// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {FlashList} from '@shopify/flash-list';
import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';

import {Preferences} from '@constants';
import {useTheme} from '@context/theme';
import {renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import EmptyState from './empty_state';
import PlaybookCard from './playbook_card';
import PlaybookRuns from './playbook_runs';

jest.mock('@context/theme', () => ({
    useTheme: jest.fn(),
}));
jest.mocked(useTheme).mockReturnValue(Preferences.THEMES.denim);

jest.mock('@shopify/flash-list', () => ({
    FlashList: jest.fn(),
}));
jest.mocked(FlashList).mockImplementation((props) => React.createElement('FlashList', {...props, testID: 'flash-list'}) as any);

jest.mock('./empty_state', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(EmptyState).mockImplementation((props) => React.createElement('EmptyState', {...props, testID: 'empty-state'}));

jest.mock('./playbook_card', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(PlaybookCard).mockImplementation((props) => React.createElement('PlaybookCard', {...props, testID: 'playbook-card'}));

describe('PlaybookRuns', () => {
    const inProgressRun = TestHelper.fakePlaybookRunModel({
        name: 'In Progress Run',
        end_at: 0,
    });

    const finishedRun = TestHelper.fakePlaybookRunModel({
        name: 'Finished Run',
        end_at: 1234567890,
    });

    it('shows empty state when no runs in selected tab', () => {
        const {getByTestId} = renderWithIntl(
            <PlaybookRuns
                allRuns={[]}
                componentId={'PlaybookRuns'}
            />,
        );

        const emptyState = getByTestId('empty-state');
        expect(emptyState).toBeTruthy();
        expect(emptyState.props.tab).toBe('finished');
    });

    it('switches between tabs correctly', () => {
        const {getByText, queryByTestId} = renderWithIntl(
            <PlaybookRuns
                allRuns={[inProgressRun, finishedRun]}
                componentId={'PlaybookRuns'}
            />,
        );

        let list = queryByTestId('flash-list');
        expect(list).toBeTruthy();
        expect(list.props.data).toEqual([inProgressRun]);

        // Switch to finished tab
        act(() => {
            fireEvent.press(getByText('Finished'));
        });

        list = queryByTestId('flash-list');
        expect(list).toBeTruthy();
        expect(list.props.data).toEqual([finishedRun]);
    });

    it('correctly separates in-progress and finished runs', () => {
        const anotherRun = TestHelper.fakePlaybookRunModel({
            name: 'Another In Progress',
            end_at: 0,
        });
        const runs = [
            inProgressRun,
            finishedRun,
            anotherRun,
        ];

        const {getByText, getByTestId} = renderWithIntl(
            <PlaybookRuns
                allRuns={runs}
                componentId={'PlaybookRuns'}
            />,
        );

        let list = getByTestId('flash-list');
        expect(list).toBeTruthy();
        expect(list.props.data).toHaveLength(2);
        expect(list.props.data).toContain(inProgressRun);
        expect(list.props.data).toContain(anotherRun);

        // Switch to finished tab
        act(() => {
            fireEvent.press(getByText('Finished'));
        });

        list = getByTestId('flash-list');
        expect(list).toBeTruthy();
        expect(list.props.data).toHaveLength(1);
        expect(list.props.data).toContain(finishedRun);
    });
});

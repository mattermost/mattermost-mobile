// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, waitFor} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import DatabaseManager from '@database/manager';
import {goToSelectPlaybook} from '@playbooks/screens/navigation';
import {renderWithEverything, renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import EmptyState from './empty_state';
import PlaybookCard from './playbook_card';
import RunList from './run_list';
import ShowMoreButton from './show_more_button';

import type {AvailableScreens} from '@typings/screens/navigation';

jest.mock('./empty_state');
jest.mocked(EmptyState).mockImplementation((props) => React.createElement('EmptyState', {...props, testID: 'empty-state'}));

jest.mock('./playbook_card');
jest.mocked(PlaybookCard).mockImplementation((props) => React.createElement('PlaybookCard', {...props, testID: 'playbook-card'}));

jest.mock('./show_more_button');
jest.mocked(ShowMoreButton).mockImplementation((props) => React.createElement('ShowMoreButton', {...props, testID: 'show-more-button'}));

jest.mock('@playbooks/screens/navigation', () => ({
    goToSelectPlaybook: jest.fn(),
}));

describe('RunList', () => {
    const componentId = 'TestScreen' as AvailableScreens;
    const inProgressRun = TestHelper.fakePlaybookRunModel({
        id: 'in-progress-1',
        name: 'In Progress Run',
    });

    const finishedRun = TestHelper.fakePlaybookRunModel({
        id: 'finished-1',
        name: 'Finished Run',
    });

    function getBaseProps(): ComponentProps<typeof RunList> {
        return {
            componentId,
            inProgressRuns: [],
            finishedRuns: [],
            fetchMoreRuns: jest.fn(),
            showMoreButton: jest.fn(() => false),
            fetching: false,
        };
    }

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state when loading is true', () => {
        const props = getBaseProps();
        props.loading = true;
        const {getByTestId} = renderWithIntlAndTheme(<RunList {...props}/>);

        expect(getByTestId('loading')).toBeTruthy();
    });

    it('renders empty state for in-progress tab when no runs', () => {
        const props = getBaseProps();
        props.inProgressRuns = [];
        props.finishedRuns = [];
        const {getByTestId} = renderWithIntlAndTheme(<RunList {...props}/>);

        const emptyState = getByTestId('empty-state');
        expect(emptyState).toBeTruthy();
        expect(emptyState.props.tab).toBe('in-progress');
    });

    it('renders empty state for finished tab when switching tabs', async () => {
        const props = getBaseProps();
        props.inProgressRuns = [inProgressRun];
        props.finishedRuns = [];
        const {getByText, getByTestId} = renderWithIntlAndTheme(<RunList {...props}/>);

        // Switch to finished tab
        act(() => {
            fireEvent.press(getByText('Finished'));
        });

        await waitFor(() => {
            const emptyState = getByTestId('empty-state');
            expect(emptyState).toBeTruthy();
            expect(emptyState.props.tab).toBe('finished');
        });
    });

    it('renders runs list when runs are available', () => {
        const props = getBaseProps();
        props.inProgressRuns = [inProgressRun];
        props.finishedRuns = [];
        const {getByTestId} = renderWithIntlAndTheme(<RunList {...props}/>);

        expect(getByTestId('runs.list')).toBeTruthy();
    });

    it('displays in-progress runs when in-progress tab is active', () => {
        const props = getBaseProps();
        props.inProgressRuns = [inProgressRun];
        props.finishedRuns = [];
        const {getByTestId} = renderWithIntlAndTheme(<RunList {...props}/>);

        const flashList = getByTestId('runs.list');
        expect(flashList.props.data).toHaveLength(1);
        expect(flashList.props.data[0]).toBe(inProgressRun);
    });

    it('displays finished runs when finished tab is active', async () => {
        const props = getBaseProps();
        props.inProgressRuns = [inProgressRun];
        props.finishedRuns = [finishedRun];
        const {getByText, getByTestId} = renderWithIntlAndTheme(<RunList {...props}/>);

        // Switch to finished tab
        act(() => {
            fireEvent.press(getByText('Finished'));
        });

        await waitFor(() => {
            const flashList = getByTestId('runs.list');
            expect(flashList.props.data).toHaveLength(1);
            expect(flashList.props.data[0]).toBe(finishedRun);
        });
    });

    it('switches between tabs correctly', async () => {
        const props = getBaseProps();
        props.inProgressRuns = [inProgressRun];
        props.finishedRuns = [finishedRun];
        const {getByText, getByTestId} = renderWithIntlAndTheme(<RunList {...props}/>);

        // Initially shows in-progress runs
        let flashList = getByTestId('runs.list');
        expect(flashList.props.data).toHaveLength(1);
        expect(flashList.props.data[0]).toBe(inProgressRun);

        // Switch to finished tab
        act(() => {
            fireEvent.press(getByText('Finished'));
        });

        await waitFor(() => {
            flashList = getByTestId('runs.list');
            expect(flashList.props.data).toHaveLength(1);
            expect(flashList.props.data[0]).toBe(finishedRun);
        });

        // Switch back to in-progress tab
        act(() => {
            fireEvent.press(getByText('In Progress'));
        });

        await waitFor(() => {
            flashList = getByTestId('runs.list');
            expect(flashList.props.data).toHaveLength(1);
            expect(flashList.props.data[0]).toBe(inProgressRun);
        });
    });

    it('defaults to finished tab when no in-progress runs', () => {
        const props = getBaseProps();
        props.inProgressRuns = [];
        props.finishedRuns = [finishedRun];
        const {getByTestId} = renderWithIntlAndTheme(<RunList {...props}/>);

        const flashList = getByTestId('runs.list');
        expect(flashList.props.data).toHaveLength(1);
        expect(flashList.props.data[0]).toBe(finishedRun);
    });

    it('shows show more button when showMoreButton returns true', () => {
        const props = getBaseProps();
        props.inProgressRuns = [inProgressRun];
        props.showMoreButton = jest.fn((tab) => tab === 'in-progress');
        const {getByTestId, getByText, queryByTestId} = renderWithIntlAndTheme(<RunList {...props}/>);

        expect(getByTestId('show-more-button')).toBeTruthy();

        // Switch to finished tab
        act(() => {
            fireEvent.press(getByText('Finished'));
        });

        expect(queryByTestId('show-more-button')).toBeNull();
    });

    it('calls fetchMoreRuns when show more button is pressed', async () => {
        const fetchMoreRuns = jest.fn();
        const props = getBaseProps();
        props.inProgressRuns = [inProgressRun];
        props.fetchMoreRuns = fetchMoreRuns;
        props.showMoreButton = jest.fn((tab) => tab === 'in-progress');
        const {getByTestId} = renderWithIntlAndTheme(<RunList {...props}/>);

        const showMoreButton = getByTestId('show-more-button');
        act(() => {
            fireEvent.press(showMoreButton);
        });

        await waitFor(() => {
            expect(fetchMoreRuns).toHaveBeenCalledWith('in-progress');
        });
    });

    it('passes fetching prop to ShowMoreButton', () => {
        const props = getBaseProps();
        props.inProgressRuns = [inProgressRun];
        props.fetching = true;
        props.showMoreButton = jest.fn(() => true);
        const {getByTestId} = renderWithIntlAndTheme(<RunList {...props}/>);

        const showMoreButton = getByTestId('show-more-button');
        expect(showMoreButton.props.fetching).toBe(true);
    });

    it('renders Start a new run button', () => {
        const props = getBaseProps();
        props.inProgressRuns = [inProgressRun];
        const {getByText} = renderWithIntlAndTheme(<RunList {...props}/>);

        expect(getByText('New')).toBeTruthy();
    });

    it('calls goToSelectPlaybook when Start a new run button is pressed', () => {
        const props = getBaseProps();
        props.inProgressRuns = [inProgressRun];
        const {getByText} = renderWithIntlAndTheme(<RunList {...props}/>);

        act(() => {
            fireEvent.press(getByText('New'));
        });

        expect(goToSelectPlaybook).toHaveBeenCalledTimes(1);
        expect(goToSelectPlaybook).toHaveBeenCalledWith(
            expect.objectContaining({
                formatMessage: expect.any(Function),
            }),
            expect.anything(),
            undefined,
        );
    });

    it('shows cached warning when showCachedWarning is true', async () => {
        // This test needs the database because it uses a Markdown component
        // underneath the SectionNotice component.
        const serverUrl = 'server-url';
        await DatabaseManager.init([serverUrl]);
        const database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;

        const props = getBaseProps();
        props.inProgressRuns = [inProgressRun];
        props.showCachedWarning = true;
        const {getByText} = renderWithEverything(<RunList {...props}/>, {database});

        expect(getByText('Cannot reach the server')).toBeTruthy();
    });

    it('hides cached warning when showCachedWarning is false', () => {
        const props = getBaseProps();
        props.inProgressRuns = [inProgressRun];
        props.showCachedWarning = false;
        const {queryByText} = renderWithIntlAndTheme(<RunList {...props}/>);

        expect(queryByText('Cannot reach the server')).toBeNull();
    });

    it('renders multiple runs correctly', () => {
        const run1 = TestHelper.fakePlaybookRunModel({id: 'run-1'});
        const run2 = TestHelper.fakePlaybookRunModel({id: 'run-2'});
        const run3 = TestHelper.fakePlaybookRunModel({id: 'run-3'});

        const props = getBaseProps();
        props.inProgressRuns = [run1, run2, run3];
        props.finishedRuns = [];
        const {getByTestId} = renderWithIntlAndTheme(<RunList {...props}/>);

        const flashList = getByTestId('runs.list');
        expect(flashList.props.data).toHaveLength(3);
        expect(flashList.props.data).toEqual([run1, run2, run3]);
    });

    it('renders both in-progress and finished runs correctly', async () => {
        const inProgressRun1 = TestHelper.fakePlaybookRunModel({id: 'in-progress-1'});
        const inProgressRun2 = TestHelper.fakePlaybookRunModel({id: 'in-progress-2'});
        const finishedRun1 = TestHelper.fakePlaybookRunModel({id: 'finished-1'});
        const finishedRun2 = TestHelper.fakePlaybookRunModel({id: 'finished-2'});

        const props = getBaseProps();
        props.inProgressRuns = [inProgressRun1, inProgressRun2];
        props.finishedRuns = [finishedRun1, finishedRun2];
        const {getByText, getByTestId} = renderWithIntlAndTheme(<RunList {...props}/>);

        // Check in-progress tab
        let flashList = getByTestId('runs.list');
        expect(flashList.props.data).toHaveLength(2);
        expect(flashList.props.data).toEqual([inProgressRun1, inProgressRun2]);

        // Switch to finished tab
        act(() => {
            fireEvent.press(getByText('Finished'));
        });

        await waitFor(() => {
            flashList = getByTestId('runs.list');
            expect(flashList.props.data).toHaveLength(2);
            expect(flashList.props.data).toEqual([finishedRun1, finishedRun2]);
        });
    });

    it('calls fetchMoreRuns with correct tab when show more is pressed on finished tab', async () => {
        const fetchMoreRuns = jest.fn();
        const props = getBaseProps();
        props.inProgressRuns = [inProgressRun];
        props.finishedRuns = [finishedRun];
        props.fetchMoreRuns = fetchMoreRuns;
        props.showMoreButton = jest.fn((tab) => tab === 'finished');
        const {getByText, getByTestId} = renderWithIntlAndTheme(<RunList {...props}/>);

        // Switch to finished tab
        act(() => {
            fireEvent.press(getByText('Finished'));
        });

        await waitFor(() => {
            const showMoreButton = getByTestId('show-more-button');
            act(() => {
                fireEvent.press(showMoreButton);
            });
        });

        await waitFor(() => {
            expect(fetchMoreRuns).toHaveBeenCalledWith('finished');
        });
    });

    it('calls goToSelectPlaybook with correct channelId when Start a new run button is pressed', () => {
        const props = getBaseProps();
        props.inProgressRuns = [inProgressRun];
        props.channelId = 'channel-id-1';
        const {getByText} = renderWithIntlAndTheme(<RunList {...props}/>);

        act(() => {
            fireEvent.press(getByText('New'));
        });

        expect(goToSelectPlaybook).toHaveBeenCalledTimes(1);
        expect(goToSelectPlaybook).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'channel-id-1');
    });
});

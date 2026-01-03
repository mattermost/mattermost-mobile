// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {act, type ComponentProps} from 'react';
import {of as of$} from 'rxjs';

import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {fetchPlaybookRunsPageForParticipant} from '@playbooks/actions/remote/runs';
import RunList from '@playbooks/components/run_list';
import {navigateBack} from '@screens/navigation';
import {renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ParticipantPlaybooks from './participant_playbooks';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@hooks/android_back_handler');
jest.mock('@playbooks/actions/remote/runs');
jest.mock('@screens/navigation');

jest.mock('@playbooks/components/run_list', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(RunList).mockImplementation(
    (props) => React.createElement('RunList', {testID: 'run_list', ...props}),
);

jest.mock('@hooks/utils', () => ({
    usePreventDoubleTap: (fn: () => void) => fn,
}));

type FetchPlaybookRunsPageForParticipantReturn = Awaited<ReturnType<typeof fetchPlaybookRunsPageForParticipant>>;

describe('ParticipantPlaybooks', () => {
    function getBaseProps(): ComponentProps<typeof ParticipantPlaybooks> {
        return {
            currentUserId: 'test-user-id',
            cachedPlaybookRuns: [],
        };
    }

    function getMockRuns(numberOfRuns: number, numberOfFinishedRuns: number): PlaybookRun[] {
        const mockRuns: PlaybookRun[] = [];
        for (let i = 0; i < numberOfRuns; i++) {
            mockRuns.push(TestHelper.fakePlaybookRun({
                id: `run-${i}`,
                name: `Test Run ${i}`,
            }));
        }

        for (let i = numberOfRuns; i < numberOfRuns + numberOfFinishedRuns; i++) {
            mockRuns.push(TestHelper.fakePlaybookRun({
                id: `finished-run-${i}`,
                name: `Test Finished Run ${i}`,
                current_status: 'Finished',
            }));
        }
        return mockRuns;
    }

    const serverUrl = 'server-url';

    let database: Database;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
    });

    afterEach(() => {
        DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('renders loading state initially', async () => {
        const props = getBaseProps();

        // Mock the fetch to return after a delay so we can check loading state
        let resolvePromise: (value: FetchPlaybookRunsPageForParticipantReturn) => void;
        const pendingPromise = new Promise<FetchPlaybookRunsPageForParticipantReturn>((resolve) => {
            resolvePromise = resolve;
        });
        jest.mocked(fetchPlaybookRunsPageForParticipant).mockReturnValue(pendingPromise);

        const {getByTestId} = renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});

        const runList = getByTestId('run_list');
        expect(runList).toHaveProp('loading', true);

        // Check that fetch was called
        await waitFor(() => {
            expect(fetchPlaybookRunsPageForParticipant).toHaveBeenCalledWith('server-url', 'test-user-id', 0);
        });

        expect(runList).toHaveProp('loading', true);

        // Resolve the promise
        act(() => {
            resolvePromise!({runs: [], hasMore: false});
        });

        await waitFor(() => {
            expect(runList).toHaveProp('loading', false);
        });
    });

    it('pass down empty runs when no runs available', async () => {
        const props = getBaseProps();
        jest.mocked(fetchPlaybookRunsPageForParticipant).mockResolvedValue({runs: [], hasMore: false});

        const {getByTestId} = renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});

        await waitFor(() => {
            const runList = getByTestId('run_list');
            expect(runList).toHaveProp('loading', false);
            expect(runList).toHaveProp('inProgressRuns', []);
            expect(runList).toHaveProp('finishedRuns', []);
        });
    });

    it('pass down empty runs when initial fetch fails and stop showing the show more button', async () => {
        const props = getBaseProps();
        jest.mocked(fetchPlaybookRunsPageForParticipant).mockResolvedValue({error: 'Network error'});

        const {getByTestId} = renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});

        await waitFor(() => {
            const runList = getByTestId('run_list');
            expect(runList).toHaveProp('loading', false);
            expect(runList).toHaveProp('inProgressRuns', []);
            expect(runList).toHaveProp('finishedRuns', []);
            expect(runList.props.showMoreButton('finished')).toBe(false);
            expect(runList.props.showMoreButton('in-progress')).toBe(false);
        });
    });

    it('pass down in progress and finished runs when data is loaded', async () => {
        const props = getBaseProps();
        const runs = getMockRuns(1, 1);
        jest.mocked(fetchPlaybookRunsPageForParticipant).mockResolvedValue({runs, hasMore: false});

        const {getByTestId} = renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});

        await waitFor(() => {
            const runList = getByTestId('run_list');
            expect(runList).toHaveProp('loading', false);
            expect(runList).toHaveProp('inProgressRuns', [runs[0]]);
            expect(runList).toHaveProp('finishedRuns', [runs[1]]);
        });
    });

    it('does not fetch data when currentUserId is not provided', () => {
        const props = getBaseProps();
        props.currentUserId = '';
        jest.mocked(fetchPlaybookRunsPageForParticipant).mockResolvedValue({runs: [], hasMore: false});

        const {getByTestId} = renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});

        const runList = getByTestId('run_list');
        expect(runList).toHaveProp('location', Screens.PARTICIPANT_PLAYBOOKS);
        expect(runList).toHaveProp('inProgressRuns', []);
        expect(runList).toHaveProp('finishedRuns', []);

        // Should not call the fetch function when no user ID
        expect(fetchPlaybookRunsPageForParticipant).not.toHaveBeenCalled();
    });

    it('shows the show more button when when we have more runs', async () => {
        const props = getBaseProps();
        const runs = getMockRuns(10, 0);
        jest.mocked(fetchPlaybookRunsPageForParticipant).mockResolvedValue({runs, hasMore: true});

        const {findByTestId} = renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});

        const runList = await findByTestId('run_list');
        expect(runList).toHaveProp('showMoreButton', expect.any(Function));

        const showMoreButton = runList.props.showMoreButton;
        expect(showMoreButton('finished')).toBe(true);
        expect(showMoreButton('in-progress')).toBe(true);
    });

    it('does not show the show more button when we do not have more runs', async () => {
        const props = getBaseProps();
        const runs = getMockRuns(10, 0);
        jest.mocked(fetchPlaybookRunsPageForParticipant).mockResolvedValue({runs, hasMore: false});

        const {findByTestId} = renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});

        const runList = await findByTestId('run_list');
        const showMoreButton = runList.props.showMoreButton;
        expect(showMoreButton('finished')).toBe(false);
        expect(showMoreButton('in-progress')).toBe(false);
    });

    it('handles pagination after several calls to fetchMoreRuns', async () => {
        const props = getBaseProps();
        const runs = getMockRuns(10, 0);
        jest.mocked(fetchPlaybookRunsPageForParticipant).mockResolvedValue({runs, hasMore: true});

        const {findByTestId} = renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});

        expect(fetchPlaybookRunsPageForParticipant).toHaveBeenCalledWith('server-url', 'test-user-id', 0);

        const runList = await findByTestId('run_list');
        act(() => {
            const fetchMoreRuns = runList.props.fetchMoreRuns;
            fetchMoreRuns('in-progress');
        });

        await waitFor(() => {
            expect(fetchPlaybookRunsPageForParticipant).toHaveBeenCalledWith('server-url', 'test-user-id', 1);
            expect(runList.props.inProgressRuns).toHaveLength(20);
        });

        act(() => {
            const fetchMoreRuns = runList.props.fetchMoreRuns;
            fetchMoreRuns('in-progress');
        });

        await waitFor(() => {
            expect(fetchPlaybookRunsPageForParticipant).toHaveBeenCalledWith('server-url', 'test-user-id', 2);
            expect(runList.props.inProgressRuns).toHaveLength(30);
        });
    });

    it('gracefully handles error after load', async () => {
        const props = getBaseProps();
        const runs = getMockRuns(10, 0);
        jest.mocked(fetchPlaybookRunsPageForParticipant).mockResolvedValue({runs, hasMore: true});

        const {findByTestId} = renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});
        expect(fetchPlaybookRunsPageForParticipant).toHaveBeenCalledWith('server-url', 'test-user-id', 0);

        jest.mocked(fetchPlaybookRunsPageForParticipant).mockResolvedValue({error: 'Network error'});
        const runList = await findByTestId('run_list');
        act(() => {
            const fetchMoreRuns = runList.props.fetchMoreRuns;
            fetchMoreRuns('in-progress');
        });

        await waitFor(() => {
            expect(runList.props.fetching).toBe(false);
            expect(fetchPlaybookRunsPageForParticipant).toHaveBeenCalledWith('server-url', 'test-user-id', 1);
            expect(runList.props.inProgressRuns).toHaveLength(10);
        });
    });

    it('set fetching while fetching more runs', async () => {
        const props = getBaseProps();
        const runs = getMockRuns(10, 0);
        jest.mocked(fetchPlaybookRunsPageForParticipant).mockResolvedValue({runs, hasMore: true});

        const {findByTestId} = renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});
        expect(fetchPlaybookRunsPageForParticipant).toHaveBeenCalledWith('server-url', 'test-user-id', 0);

        const runList = await findByTestId('run_list');
        act(() => {
            const fetchMoreRuns = runList.props.fetchMoreRuns;
            fetchMoreRuns('in-progress');
        });

        // Should set fetching as soon as we call fetchMoreRuns
        await waitFor(() => {
            expect(runList).toHaveProp('fetching', true);
        });

        // Wait for the results to be set
        await waitFor(() => {
            expect(runList.props.inProgressRuns).toHaveLength(20);
        });

        // Should set fetching to false when the results are set
        expect(runList).toHaveProp('fetching', false);
    });

    it('should show cached warning when API fails and database has data', async () => {
        jest.mocked(fetchPlaybookRunsPageForParticipant).mockResolvedValue({
            error: 'Network error',
        });

        // Mock database returning cached data
        const mockDatabaseRun = TestHelper.fakePlaybookRunModel({});
        jest.mocked(mockDatabaseRun.observe).mockReturnValue(of$(mockDatabaseRun));

        const props = getBaseProps();
        props.cachedPlaybookRuns = [mockDatabaseRun];

        const {getByTestId} = renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});

        await waitFor(() => {
            const runList = getByTestId('run_list');
            expect(runList).toHaveProp('loading', false);
            expect(runList).toHaveProp('showCachedWarning', true);
            expect(runList).toHaveProp('inProgressRuns', [mockDatabaseRun]);
        });
    });

    it('should not show cached warning if there are no cached runs', async () => {
        const props = getBaseProps();
        jest.mocked(fetchPlaybookRunsPageForParticipant).mockResolvedValue({error: 'Network error'});

        const {getByTestId} = renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});

        await waitFor(() => {
            const runList = getByTestId('run_list');
            expect(runList).toHaveProp('loading', false);
            expect(runList).toHaveProp('showCachedWarning', false);
        });
    });

    it('should not show cached warning when API succeeds', async () => {
        const props = getBaseProps();
        const runs = getMockRuns(1, 1);

        jest.mocked(fetchPlaybookRunsPageForParticipant).mockResolvedValue({
            runs,
            hasMore: false,
        });

        const {getByTestId} = renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});

        await waitFor(() => {
            const runList = getByTestId('run_list');
            expect(runList).toHaveProp('loading', false);
            expect(runList).toHaveProp('showCachedWarning', false);
        });
    });

    it('handles Android back button', async () => {
        const props = getBaseProps();

        renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(Screens.PARTICIPANT_PLAYBOOKS, expect.any(Function));

        const closeHandler = jest.mocked(useAndroidHardwareBackHandler).mock.calls[0][1];
        await act(async () => {
            closeHandler();
        });

        expect(navigateBack).toHaveBeenCalled();
    });

    it('should not load more if there are no more runs', async () => {
        const props = getBaseProps();
        const runs = getMockRuns(10, 0);
        jest.mocked(fetchPlaybookRunsPageForParticipant).mockResolvedValue({runs, hasMore: false});

        const {findByTestId} = renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});
        expect(fetchPlaybookRunsPageForParticipant).toHaveBeenCalledWith('server-url', 'test-user-id', 0);

        const runList = await findByTestId('run_list');
        act(() => {
            const fetchMoreRuns = runList.props.fetchMoreRuns;
            fetchMoreRuns('in-progress');
        });

        await waitFor(() => {
            expect(fetchPlaybookRunsPageForParticipant).toHaveBeenCalledTimes(1);
            expect(runList.props.fetching).toBe(false);
            expect(runList.props.inProgressRuns).toHaveLength(10);
        });
    });
});

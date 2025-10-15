// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {act, type ComponentProps} from 'react';
import {of as of$} from 'rxjs';

import DatabaseManager from '@database/manager';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {fetchPlaybookRunsPageForParticipant} from '@playbooks/actions/remote/runs';
import {fireEvent, renderWithEverything, waitFor, waitForElementToBeRemoved} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ParticipantPlaybooks from './participant_playbooks';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@hooks/android_back_handler');
jest.mock('@playbooks/actions/remote/runs');

type FetchPlaybookRunsPageForParticipantReturn = Awaited<ReturnType<typeof fetchPlaybookRunsPageForParticipant>>;

describe('ParticipantPlaybooks', () => {
    function getBaseProps(): ComponentProps<typeof ParticipantPlaybooks> {
        return {
            currentUserId: 'test-user-id',
            componentId: 'ParticipantPlaybooks',
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

        const {getByTestId, queryByTestId} = renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});

        expect(getByTestId('loading')).toBeTruthy();

        // Check that fetch was called
        await waitFor(() => {
            expect(fetchPlaybookRunsPageForParticipant).toHaveBeenCalledWith('server-url', 'test-user-id', 0);
        });

        expect(getByTestId('loading')).toBeTruthy();

        // Resolve the promise
        act(() => {
            resolvePromise!({runs: [], hasMore: false});
        });

        await waitForElementToBeRemoved(() => queryByTestId('loading'));
    });

    it('renders empty state when no runs available', async () => {
        const props = getBaseProps();
        jest.mocked(fetchPlaybookRunsPageForParticipant).mockResolvedValue({runs: [], hasMore: false});

        const {queryByTestId, getByText} = renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});

        await waitForElementToBeRemoved(() => queryByTestId('loading'));

        // Should show empty state instead of loading
        expect(getByText('No in progress runs')).toBeVisible();
    });

    it('renders error state when fetch fails', async () => {
        const props = getBaseProps();
        jest.mocked(fetchPlaybookRunsPageForParticipant).mockResolvedValue({error: 'Network error'});

        const {queryByTestId, getByText} = renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});

        await waitForElementToBeRemoved(() => queryByTestId('loading'));

        // Should show empty state instead of loading
        expect(getByText('No in progress runs')).toBeVisible();
    });

    it('renders playbook runs when data is loaded', async () => {
        const props = getBaseProps();
        const runs = getMockRuns(1, 1);
        jest.mocked(fetchPlaybookRunsPageForParticipant).mockResolvedValue({runs, hasMore: false});

        const {queryByTestId, getByText} = renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});

        await waitForElementToBeRemoved(() => queryByTestId('loading'));

        expect(getByText('Test Run 0')).toBeVisible();
        expect(queryByTestId('Test Run 1')).not.toBeVisible();
    });

    it('does not fetch data when currentUserId is not provided', () => {
        const props = getBaseProps();
        props.currentUserId = '';
        jest.mocked(fetchPlaybookRunsPageForParticipant).mockResolvedValue({runs: [], hasMore: false});

        renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});

        // Should not call the fetch function when no user ID
        expect(fetchPlaybookRunsPageForParticipant).not.toHaveBeenCalled();
    });

    it('handles Android back button', () => {
        const props = getBaseProps();
        const {popTopScreen} = require('@screens/navigation');

        renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(props.componentId, expect.any(Function));

        const closeHandler = jest.mocked(useAndroidHardwareBackHandler).mock.calls[0][1];
        closeHandler();

        expect(popTopScreen).toHaveBeenCalledWith(props.componentId);
    });

    it('handles pagination with hasMore=true', async () => {
        const props = getBaseProps();
        const runs = getMockRuns(10, 0);
        jest.mocked(fetchPlaybookRunsPageForParticipant).mockResolvedValue({runs, hasMore: true});

        const {queryByTestId, getByTestId} = renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});

        await waitForElementToBeRemoved(() => queryByTestId('loading'));

        expect(fetchPlaybookRunsPageForParticipant).toHaveBeenCalledWith('server-url', 'test-user-id', 0);

        // Should set hasMore state to false when the API response indicates no more data
        expect(fetchPlaybookRunsPageForParticipant).toHaveBeenCalledTimes(1);

        const list = getByTestId('runs.list');

        await act(async () => {
            fireEvent(list, 'onEndReached');
        });

        expect(fetchPlaybookRunsPageForParticipant).toHaveBeenCalledWith('server-url', 'test-user-id', 1);
        expect(fetchPlaybookRunsPageForParticipant).toHaveBeenCalledTimes(2);
    });

    it('handles pagination with hasMore=false', async () => {
        const props = getBaseProps();
        const runs = getMockRuns(10, 0);
        jest.mocked(fetchPlaybookRunsPageForParticipant).mockResolvedValue({runs, hasMore: false});

        const {queryByTestId, getByTestId} = renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});

        await waitForElementToBeRemoved(() => queryByTestId('loading'));

        expect(fetchPlaybookRunsPageForParticipant).toHaveBeenCalledWith('server-url', 'test-user-id', 0);

        // Should set hasMore state to false when the API response indicates no more data
        expect(fetchPlaybookRunsPageForParticipant).toHaveBeenCalledTimes(1);

        const list = getByTestId('runs.list');

        await act(async () => {
            fireEvent(list, 'onEndReached');
        });

        expect(fetchPlaybookRunsPageForParticipant).toHaveBeenCalledTimes(1);
    });

    it('should show cached warning when API fails and database has data', async () => {
        // Mock API failure
        jest.mocked(fetchPlaybookRunsPageForParticipant).mockResolvedValue({
            error: 'Network error',
        });

        // Mock database returning cached data
        const mockDatabaseRun = TestHelper.fakePlaybookRunModel({});
        jest.mocked(mockDatabaseRun.observe).mockReturnValue(of$(mockDatabaseRun));

        const props = getBaseProps();
        props.cachedPlaybookRuns = [mockDatabaseRun];

        const {getByText, queryByTestId} = renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});

        await waitForElementToBeRemoved(() => queryByTestId('loading'));

        expect(getByText(/Showing cached data only/)).toBeVisible();
    });

    it('should not show cached warning when API succeeds', async () => {
        const props = getBaseProps();
        const runs = getMockRuns(1, 1);

        jest.mocked(fetchPlaybookRunsPageForParticipant).mockResolvedValue({
            runs,
            hasMore: false,
        });

        const {queryByText, queryByTestId} = renderWithEverything(<ParticipantPlaybooks {...props}/>, {database, serverUrl});

        await waitForElementToBeRemoved(() => queryByTestId('loading'));

        expect(queryByText(/Showing cached data only/)).not.toBeVisible();
    });
});

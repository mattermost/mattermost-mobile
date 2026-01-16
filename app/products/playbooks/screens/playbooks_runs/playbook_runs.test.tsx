// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, waitFor} from '@testing-library/react-native';
import React from 'react';

import {Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {fetchFinishedRunsForChannel} from '@playbooks/actions/remote/runs';
import RunList from '@playbooks/components/run_list';
import {navigateBack} from '@screens/navigation';
import {renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import PlaybookRuns from './playbook_runs';

jest.mock('@playbooks/components/run_list');
jest.mocked(RunList).mockImplementation((props) => React.createElement('RunList', {...props, testID: 'run-list'}));

jest.mock('@playbooks/screens/navigation', () => ({
    goToSelectPlaybook: jest.fn(),
}));

jest.mock('@playbooks/actions/remote/runs', () => ({
    fetchFinishedRunsForChannel: jest.fn(),
}));

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => 'server-url'),
}));

jest.mock('@screens/navigation');

jest.mock('@hooks/android_back_handler');

describe('PlaybookRuns', () => {
    const inProgressRun = TestHelper.fakePlaybookRunModel({
        name: 'In Progress Run',
        currentStatus: 'InProgress',
    });

    const finishedRun = TestHelper.fakePlaybookRunModel({
        name: 'Finished Run',
        currentStatus: 'Finished',
    });

    it('provides empty lists when no runs', () => {
        const {getByTestId} = renderWithIntl(
            <PlaybookRuns
                allRuns={[]}
                channelId={'channel-id-1'}
            />,
        );

        const runList = getByTestId('run-list');

        expect(runList.props.inProgressRuns).toHaveLength(0);
        expect(runList.props.finishedRuns).toHaveLength(0);
    });

    it('sets the correct runs to the correct props', () => {
        const {getByTestId} = renderWithIntl(
            <PlaybookRuns
                allRuns={[inProgressRun, finishedRun]}
                channelId={'channel-id-1'}
            />,
        );
        const runList = getByTestId('run-list');
        expect(runList.props.inProgressRuns).toHaveLength(1);
        expect(runList.props.finishedRuns).toHaveLength(1);
        expect(runList.props.inProgressRuns[0]).toBe(inProgressRun);
        expect(runList.props.finishedRuns[0]).toBe(finishedRun);
    });

    it('shows the show more button only on finished tabs', () => {
        const {getByTestId} = renderWithIntl(
            <PlaybookRuns
                allRuns={[inProgressRun, finishedRun]}
                channelId={'channel-id-1'}
            />,
        );

        const runLists = getByTestId('run-list');
        expect(runLists.props.showMoreButton('in-progress')).toBe(false);
        expect(runLists.props.showMoreButton('finished')).toBe(true);
    });

    it('hides the show more button when there are no more runs', async () => {
        const {getByTestId} = renderWithIntl(
            <PlaybookRuns
                allRuns={[inProgressRun]}
                channelId={'channel-id-1'}
            />,
        );

        const runList = getByTestId('run-list');
        expect(runList.props.showMoreButton('finished')).toBe(true);

        jest.mocked(fetchFinishedRunsForChannel).mockResolvedValue({runs: [], has_more: false});
        act(() => {
            runList.props.fetchMoreRuns('finished');
        });

        await waitFor(() => {
            expect(runList.props.showMoreButton('finished')).toBe(false);
        });
    });

    it('calls fetchMoreRuns when show more button is pressed and paginates', async () => {
        const moreRuns1 = TestHelper.fakePlaybookRun({id: 'more-run-1'});
        jest.mocked(fetchFinishedRunsForChannel).mockResolvedValue({runs: [moreRuns1], has_more: true});
        const {getByTestId} = renderWithIntl(
            <PlaybookRuns
                allRuns={[inProgressRun]}
                channelId={'channel-id-1'}
            />,
        );

        const runList = getByTestId('run-list');
        let fetchMoreRuns = runList.props.fetchMoreRuns;

        act(() => {
            fetchMoreRuns('finished');
        });

        await waitFor(() => {
            expect(runList.props.fetching).toBe(true);
        });

        await waitFor(() => {
            expect(fetchFinishedRunsForChannel).toHaveBeenCalledWith('server-url', 'channel-id-1', 0);
            expect(runList.props.finishedRuns).toHaveLength(1);
            expect(runList.props.finishedRuns[0]).toBe(moreRuns1);
        });

        expect(runList.props.fetching).toBe(false);

        fetchMoreRuns = runList.props.fetchMoreRuns;
        const moreRuns2 = TestHelper.fakePlaybookRun({id: 'more-run-2'});
        jest.mocked(fetchFinishedRunsForChannel).mockResolvedValue({runs: [moreRuns2], has_more: true});
        act(() => {
            fetchMoreRuns('finished');
        });

        await waitFor(() => {
            expect(runList.props.fetching).toBe(true);
        });

        await waitFor(() => {
            expect(fetchFinishedRunsForChannel).toHaveBeenCalledWith('server-url', 'channel-id-1', 1);
            expect(runList.props.finishedRuns).toHaveLength(2);
            expect(runList.props.finishedRuns[0]).toBe(moreRuns1);
            expect(runList.props.finishedRuns[1]).toBe(moreRuns2);
        });

        expect(runList.props.fetching).toBe(false);
    });

    it('does not fetch more runs while fetching', async () => {
        const {getByTestId} = renderWithIntl(
            <PlaybookRuns
                allRuns={[inProgressRun]}
                channelId={'channel-id-1'}
            />,
        );

        const runList = getByTestId('run-list');
        let resolvePromise: (() => void) | undefined;
        jest.mocked(fetchFinishedRunsForChannel).mockImplementation(() => {
            const promise = new Promise<{runs: PlaybookRun[]; has_more: boolean}>((resolve) => {
                resolvePromise = () => resolve({runs: [], has_more: true});
            });
            return promise;
        });

        act(() => {
            runList.props.fetchMoreRuns('finished');
        });

        await waitFor(() => {
            expect(runList.props.fetching).toBe(true);
        });
        expect(fetchFinishedRunsForChannel).toHaveBeenCalledTimes(1);
        expect(fetchFinishedRunsForChannel).toHaveBeenCalledWith('server-url', 'channel-id-1', 0);

        act(() => {
            runList.props.fetchMoreRuns('finished');
        });

        await waitFor(() => {
            expect(fetchFinishedRunsForChannel).toHaveBeenCalledTimes(1);
        });
        resolvePromise?.();
    });

    it('an error on fetch more runs hides the show more button', async () => {
        const {getByTestId} = renderWithIntl(
            <PlaybookRuns
                allRuns={[inProgressRun]}
                channelId={'channel-id-1'}
            />,
        );

        const runList = getByTestId('run-list');
        expect(runList.props.showMoreButton('finished')).toBe(true);

        jest.mocked(fetchFinishedRunsForChannel).mockResolvedValue({error: 'error'});
        act(() => {
            runList.props.fetchMoreRuns('finished');
        });

        await waitFor(() => {
            expect(runList.props.showMoreButton('finished')).toBe(false);
        });
    });

    it('does not fetch more runs on in-progress tab', async () => {
        const {getByTestId} = renderWithIntl(
            <PlaybookRuns
                allRuns={[inProgressRun]}
                channelId={'channel-id-1'}
            />,
        );

        const runList = getByTestId('run-list');
        act(() => {
            runList.props.fetchMoreRuns('in-progress');
        });

        expect(fetchFinishedRunsForChannel).not.toHaveBeenCalled();
    });

    it('handles Android back button', async () => {
        renderWithIntl(
            <PlaybookRuns
                allRuns={[inProgressRun]}
                channelId={'channel-id-1'}
            />,
        );

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(Screens.PLAYBOOKS_RUNS, expect.any(Function));

        const closeHandler = jest.mocked(useAndroidHardwareBackHandler).mock.calls[0][1];
        await act(async () => {
            closeHandler();
        });

        expect(navigateBack).toHaveBeenCalled();
    });

    it('passes down the channel id to the run list', () => {
        const {getByTestId} = renderWithIntl(
            <PlaybookRuns
                allRuns={[inProgressRun]}
                channelId={'channel-id-1'}
            />,
        );
        const runList = getByTestId('run-list');
        expect(runList).toHaveProp('channelId', 'channel-id-1');
    });
});

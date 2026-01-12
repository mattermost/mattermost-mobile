// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, waitFor} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {switchToChannelById} from '@actions/remote/channel';
import SearchBar from '@components/search';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {fetchPlaybooks} from '@playbooks/actions/remote/playbooks';
import {fetchPlaybookRunsForChannel} from '@playbooks/actions/remote/runs';
import {dismissAllRoutesAndResetToRootRoute, navigateBack} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import {goToPlaybookRun, goToStartARun} from '../navigation';

import PlaybookRow from './playbook_row';
import SelectPlaybook from './select_playbook';

jest.mock('@actions/remote/channel', () => ({
    switchToChannelById: jest.fn(),
}));

jest.mock('@playbooks/actions/remote/playbooks', () => ({
    fetchPlaybooks: jest.fn(),
}));

jest.mock('@playbooks/actions/remote/runs', () => ({
    fetchPlaybookRunsForChannel: jest.fn(),
}));

jest.mock('@playbooks/screens/navigation', () => ({
    goToStartARun: jest.fn(),
    goToPlaybookRun: jest.fn(),
}));

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(),
}));

jest.mock('@hooks/android_back_handler', () => jest.fn());

jest.mock('./playbook_row', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(PlaybookRow).mockImplementation(
    (props) => React.createElement('PlaybookRow', {testID: 'playbook-row', ...props}),
);

jest.mock('@components/search', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(SearchBar).mockImplementation(
    (props) => React.createElement('SearchBar', {...props}),
);

jest.mock('@screens/navigation');

const mockServerUrl = 'https://test-server.com';

describe('SelectPlaybook', () => {
    function getBaseProps(): ComponentProps<typeof SelectPlaybook> {
        return {
            currentTeamId: 'team-id-1',
            currentUserId: 'user-id-1',
            playbooksUsedInChannel: new Set<string>(),
        };
    }

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(useServerUrl).mockReturnValue(mockServerUrl);
        jest.mocked(fetchPlaybooks).mockResolvedValue({
            data: {
                total_count: 0,
                page_count: 0,
                has_more: false,
                items: [],
            },
        });
        jest.mocked(fetchPlaybookRunsForChannel).mockResolvedValue({});
        jest.mocked(switchToChannelById).mockResolvedValue({});
        jest.mocked(goToStartARun).mockResolvedValue();
        jest.mocked(goToPlaybookRun).mockResolvedValue();
    });

    it('renders correctly with no data', async () => {
        const props = getBaseProps();
        const {getByTestId, getByText} = renderWithIntlAndTheme(<SelectPlaybook {...props}/>);

        expect(getByTestId('selector.search_bar')).toBeTruthy();
        await waitFor(() => {
            expect(getByText('No Results')).toBeVisible();
        });
    });

    it('loads playbooks on mount', async () => {
        const mockPlaybooks = [
            TestHelper.fakePlaybook({id: 'playbook-1', title: 'Playbook 1'}),
            TestHelper.fakePlaybook({id: 'playbook-2', title: 'Playbook 2', members: [{user_id: 'user-id-1', roles: []}]}),
        ];

        jest.mocked(fetchPlaybooks).mockResolvedValueOnce({
            data: {
                total_count: 2,
                page_count: 1,
                has_more: false,
                items: mockPlaybooks,
            },
        });

        const props = getBaseProps();
        const {getAllByTestId, getByText, queryByText} = renderWithIntlAndTheme(<SelectPlaybook {...props}/>);

        await waitFor(() => {
            expect(fetchPlaybooks).toHaveBeenCalledWith(mockServerUrl, {
                team_id: 'team-id-1',
                page: 0,
            });
        });

        await waitFor(() => {
            expect(getByText('Your Playbooks')).toBeVisible();
            expect(queryByText('In This Channel')).not.toBeVisible();
            expect(getByText('Other Playbooks')).toBeVisible();

            const allPlaybookRows = getAllByTestId('playbook-row');
            expect(allPlaybookRows).toHaveLength(2);

            // We assume Your Playbooks section appears first in the list
            expect(allPlaybookRows[0]).toHaveProp('playbook', mockPlaybooks[1]);
            expect(allPlaybookRows[1]).toHaveProp('playbook', mockPlaybooks[0]);
        });
    });

    it('shows loading indicator while fetching initial data', async () => {
        let resolveFetch: () => void;
        const fetchPromise = new Promise((resolve) => {
            resolveFetch = () => resolve({
                data: {
                    total_count: 0,
                    page_count: 0,
                    has_more: false,
                    items: [],
                },
            });
        });

        jest.mocked(fetchPlaybooks).mockReturnValueOnce(fetchPromise as any);

        const props = getBaseProps();
        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(<SelectPlaybook {...props}/>);

        await waitFor(() => {
            expect(getByTestId('selector.loading')).toBeVisible();
        });

        act(() => {
            resolveFetch();
        });

        await waitFor(() => {
            expect(queryByTestId('selector.loading')).not.toBeVisible();
        });
    });

    it('handles pagination correctly when has_more is true', async () => {
        const firstPage = [
            TestHelper.fakePlaybook({id: 'playbook-1', title: 'Playbook 1'}),
        ];
        const secondPage = [
            TestHelper.fakePlaybook({id: 'playbook-2', title: 'Playbook 2'}),
        ];

        jest.mocked(fetchPlaybooks).
            mockResolvedValueOnce({
                data: {
                    total_count: 2,
                    page_count: 1,
                    has_more: true,
                    items: firstPage,
                },
            }).
            mockResolvedValueOnce({
                data: {
                    total_count: 2,
                    page_count: 1,
                    has_more: false,
                    items: secondPage,
                },
            });

        const props = getBaseProps();
        const {getByTestId, getAllByTestId} = renderWithIntlAndTheme(<SelectPlaybook {...props}/>);

        await waitFor(() => {
            expect(fetchPlaybooks).toHaveBeenCalledTimes(1);
            expect(fetchPlaybooks).toHaveBeenCalledWith(mockServerUrl, {
                team_id: 'team-id-1',
                page: 0,
            });
        });

        act(() => {
            const list = getByTestId('selector.section_list');
            fireEvent(list, 'onEndReached');
        });

        await waitFor(() => {
            expect(fetchPlaybooks).toHaveBeenCalledWith(mockServerUrl, {
                team_id: 'team-id-1',
                page: 1,
            });
            expect(fetchPlaybooks).toHaveBeenCalledTimes(2);
            const allPlaybookRows = getAllByTestId('playbook-row');
            expect(allPlaybookRows).toHaveLength(2);
            expect(allPlaybookRows[0]).toHaveProp('playbook', firstPage[0]);
            expect(allPlaybookRows[1]).toHaveProp('playbook', secondPage[0]);
        });
    });

    it('handles search correctly', async () => {
        const searchTerm = 'test search';
        const searchResults = [
            TestHelper.fakePlaybook({id: 'playbook-search-1', title: 'Search Result 1'}),
        ];

        const props = getBaseProps();
        const {getByTestId, queryByText} = renderWithIntlAndTheme(<SelectPlaybook {...props}/>);

        jest.mocked(fetchPlaybooks).mockResolvedValueOnce({
            data: {
                total_count: 1,
                page_count: 1,
                has_more: false,
                items: searchResults,
            },
        });

        const searchBar = getByTestId('selector.search_bar');
        act(() => {
            searchBar.props.onChangeText(searchTerm);
        });

        await waitFor(() => {
            expect(fetchPlaybooks).toHaveBeenCalledWith(mockServerUrl, {
                team_id: 'team-id-1',
                search_term: searchTerm,
                sort: 'last_run_at',
            });
        });

        await waitFor(() => {
            // Ensure no sections are visible on search results
            expect(queryByText('In This Channel')).not.toBeVisible();
            expect(queryByText('Your Playbooks')).not.toBeVisible();
            expect(queryByText('Other Playbooks')).not.toBeVisible();
            expect(getByTestId('playbook-row')).toHaveProp('playbook', searchResults[0]);
        });
    });

    it('clears search when search term is empty', async () => {
        const props = getBaseProps();

        jest.mocked(fetchPlaybooks).mockResolvedValueOnce({
            data: {
                total_count: 0,
                page_count: 0,
                has_more: false,
                items: [TestHelper.fakePlaybook({id: 'playbook-1', title: 'Playbook 1'})],
            },
        });

        const {getByTestId, getByText, queryByText} = renderWithIntlAndTheme(<SelectPlaybook {...props}/>);

        const searchBar = getByTestId('selector.search_bar');

        // Initial load
        expect(fetchPlaybooks).toHaveBeenCalledTimes(1);

        // Set a search term
        act(() => {
            searchBar.props.onChangeText('test');
        });

        await waitFor(() => {
            expect(fetchPlaybooks).toHaveBeenCalledTimes(2); // First load + search
            expect(getByText('No Results')).toBeVisible();
        });

        // Clear search
        act(() => {
            searchBar.props.onChangeText('');
        });

        await waitFor(() => {
            expect(fetchPlaybooks).toHaveBeenCalledTimes(2); // Only load and first search
            expect(queryByText('No Results')).not.toBeVisible();
            expect(getByText('Other Playbooks')).toBeVisible();
        });
    });

    it('cancels previous search when new search is initiated', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<SelectPlaybook {...props}/>);

        // Clear the mock call from initial render
        jest.mocked(fetchPlaybooks).mockClear();

        const searchBar = getByTestId('selector.search_bar');

        // Start first search
        act(() => {
            searchBar.props.onChangeText('first');
        });

        // Start second search before first completes
        act(() => {
            searchBar.props.onChangeText('second');
        });

        await waitFor(() => {
            // Should only call with the last search term
            expect(fetchPlaybooks).toHaveBeenCalledWith(
                mockServerUrl,
                expect.objectContaining({
                    search_term: 'second',
                }),
            );
            expect(fetchPlaybooks).toHaveBeenCalledTimes(1);
        });
    });

    it('organizes playbooks into sections correctly', async () => {
        const currentUserId = 'user-id-1';
        const otherUserId = 'user-id-2';
        const playbookInChannel = TestHelper.fakePlaybook({
            id: 'playbook-in-channel',
            title: 'In Channel Playbook',
            members: [{user_id: otherUserId, roles: []}],
        });
        const userPlaybook = TestHelper.fakePlaybook({
            id: 'playbook-user',
            title: 'User Playbook',
            members: [{user_id: currentUserId, roles: []}],
        });
        const otherPlaybook = TestHelper.fakePlaybook({
            id: 'playbook-other',
            title: 'Other Playbook',
            members: [{user_id: otherUserId, roles: []}],
        });

        jest.mocked(fetchPlaybooks).mockResolvedValueOnce({
            data: {
                total_count: 3,
                page_count: 1,
                has_more: false,
                items: [otherPlaybook, playbookInChannel, userPlaybook],
            },
        });

        const props = getBaseProps();
        props.playbooksUsedInChannel = new Set(['playbook-in-channel']);

        const {getByText, getAllByTestId} = renderWithIntlAndTheme(<SelectPlaybook {...props}/>);

        await waitFor(() => {
            expect(getByText('In This Channel')).toBeTruthy();
            expect(getByText('Your Playbooks')).toBeTruthy();
            expect(getByText('Other Playbooks')).toBeTruthy();
            const allPlaybookRows = getAllByTestId('playbook-row');
            expect(allPlaybookRows).toHaveLength(3);

            // We assume the order of sections
            expect(allPlaybookRows[0]).toHaveProp('playbook', playbookInChannel);
            expect(allPlaybookRows[1]).toHaveProp('playbook', userPlaybook);
            expect(allPlaybookRows[2]).toHaveProp('playbook', otherPlaybook);
        });
    });

    it('filters out empty sections', async () => {
        const userPlaybook = TestHelper.fakePlaybook({
            id: 'playbook-user',
            title: 'User Playbook',
            members: [{user_id: 'user-id-1', roles: []}],
        });

        jest.mocked(fetchPlaybooks).mockResolvedValueOnce({
            data: {
                total_count: 1,
                page_count: 1,
                has_more: false,
                items: [userPlaybook],
            },
        });

        const props = getBaseProps();
        const {queryByText, getByText} = renderWithIntlAndTheme(<SelectPlaybook {...props}/>);

        await waitFor(() => {
            expect(queryByText('In This Channel')).not.toBeVisible();
            expect(getByText('Your Playbooks')).toBeVisible();
            expect(queryByText('Other Playbooks')).not.toBeVisible();
        });
    });

    it('calls goToStartARun when playbook is pressed', async () => {
        const mockPlaybook = TestHelper.fakePlaybook({
            id: 'playbook-1',
            title: 'Test Playbook',
        });

        jest.mocked(fetchPlaybooks).mockResolvedValueOnce({
            data: {
                total_count: 1,
                page_count: 1,
                has_more: false,
                items: [mockPlaybook],
            },
        });

        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<SelectPlaybook {...props}/>);

        await waitFor(() => {
            const playbookRow = getByTestId('playbook-row');
            expect(playbookRow).toBeTruthy();

            act(() => {
                playbookRow.props.onPress(mockPlaybook);
            });
        });

        await waitFor(() => {
            expect(goToStartARun).toHaveBeenCalledWith(
                mockPlaybook,
                expect.any(Function), // onRunCreated callback
                undefined, // channelId
            );
        });
    });

    it('handles run creation correctly', async () => {
        const mockPlaybook = TestHelper.fakePlaybook({
            id: 'playbook-1',
            title: 'Test Playbook',
        });
        const mockRun = TestHelper.fakePlaybookRun({
            id: 'run-1',
            channel_id: 'channel-id-1',
        });

        jest.mocked(fetchPlaybooks).mockResolvedValueOnce({
            data: {
                total_count: 1,
                page_count: 1,
                has_more: false,
                items: [mockPlaybook],
            },
        });

        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<SelectPlaybook {...props}/>);

        await waitFor(() => {
            const playbookRow = getByTestId('playbook-row');
            expect(playbookRow).toBeTruthy();

            act(() => {
                playbookRow.props.onPress(mockPlaybook);
            });
        });

        await waitFor(() => {
            expect(goToStartARun).toHaveBeenCalled();
        });

        // Get the onRunCreated callback and call it
        const onRunCreated = jest.mocked(goToStartARun).mock.calls[0][1];
        act(() => {
            onRunCreated(mockRun);
        });

        await waitFor(() => {
            expect(dismissAllRoutesAndResetToRootRoute).toHaveBeenCalledWith();
            expect(fetchPlaybookRunsForChannel).toHaveBeenCalledWith(mockServerUrl, 'channel-id-1');
            expect(switchToChannelById).toHaveBeenCalledWith(mockServerUrl, 'channel-id-1');
            expect(goToPlaybookRun).toHaveBeenCalledWith('run-1');
        });
    });

    it('should clear all resutls when receiving a search failure', async () => {
        const props = getBaseProps();
        const {getByTestId, getAllByTestId, getByText} = renderWithIntlAndTheme(<SelectPlaybook {...props}/>);

        // Add some search results
        jest.mocked(fetchPlaybooks).mockResolvedValueOnce({
            data: {
                total_count: 1,
                page_count: 1,
                has_more: false,
                items: [TestHelper.fakePlaybook({id: 'playbook-1', title: 'Playbook 1'})],
            },
        });

        const searchBar = getByTestId('selector.search_bar');
        act(() => {
            searchBar.props.onChangeText('test');
        });

        await waitFor(() => {
            expect(getAllByTestId('playbook-row')).toHaveLength(1);
        });

        // Have a search error
        jest.mocked(fetchPlaybooks).mockResolvedValueOnce({error: 'Search failed'});
        act(() => {
            searchBar.props.onChangeText('test2');
        });

        await waitFor(() => {
            expect(getByText('No Results')).toBeVisible();
        });
    });

    it('handles Android back button', async () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<SelectPlaybook {...props}/>);

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(Screens.PLAYBOOKS_SELECT_PLAYBOOK, expect.any(Function));

        const closeHandler = jest.mocked(useAndroidHardwareBackHandler).mock.calls[0][1];
        act(() => {
            closeHandler();
        });

        await waitFor(() => {
            expect(navigateBack).toHaveBeenCalled();
        });
    });

    it('should not load more plyabooks while it is loading', async () => {
        const props = getBaseProps();

        let resolveFetch: () => void;
        jest.mocked(fetchPlaybooks).mockReturnValueOnce(new Promise((resolve) => {
            resolveFetch = () => resolve({
                data: {
                    total_count: 1,
                    page_count: 1,
                    has_more: true,
                    items: [TestHelper.fakePlaybook({id: 'playbook-1', title: 'Playbook 1'})],
                },
            });
        }));

        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(<SelectPlaybook {...props}/>);
        expect(fetchPlaybooks).toHaveBeenCalledTimes(1);

        act(() => {
            const list = getByTestId('selector.section_list');
            fireEvent(list, 'onEndReached');
        });

        expect(getByTestId('selector.loading')).toBeVisible();
        expect(fetchPlaybooks).toHaveBeenCalledTimes(1);

        act(() => {
            resolveFetch();
        });

        await waitFor(() => {
            expect(queryByTestId('selector.loading')).not.toBeVisible();
            expect(fetchPlaybooks).toHaveBeenCalledTimes(1);
        });
    });

    it('should not load more playbooks if there are no more', async () => {
        const props = getBaseProps();

        jest.mocked(fetchPlaybooks).mockResolvedValueOnce({
            data: {
                total_count: 1,
                page_count: 1,
                has_more: false,
                items: [TestHelper.fakePlaybook({id: 'playbook-1', title: 'Playbook 1'})],
            },
        });

        const {getByTestId} = renderWithIntlAndTheme(<SelectPlaybook {...props}/>);
        expect(fetchPlaybooks).toHaveBeenCalledTimes(1);
        await waitFor(() => {
            expect(getByTestId('playbook-row')).toBeVisible();
        });

        act(() => {
            const list = getByTestId('selector.section_list');
            fireEvent(list, 'onEndReached');
        });

        await waitFor(() => {
            expect(fetchPlaybooks).toHaveBeenCalledTimes(1);
        });
    });

    it('should handle load error gracefully', async () => {
        // Have a load error
        jest.mocked(fetchPlaybooks).mockResolvedValueOnce({error: 'Load failed'});

        const props = getBaseProps();
        const {getByText} = renderWithIntlAndTheme(<SelectPlaybook {...props}/>);

        await waitFor(() => {
            expect(getByText('No Results')).toBeVisible();
        });
    });
});

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {
    fetchChannelSharedRemotes,
    fetchRemoteClusters,
    shareChannelWithRemote,
} from '@actions/remote/channel';
import {act, fireEvent, renderWithIntlAndTheme, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChannelShare from './channel_share';

const serverUrl = 'https://server.test';

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => serverUrl),
}));
jest.mock('@actions/remote/channel', () => ({
    fetchChannelSharedRemotes: jest.fn(),
    fetchRemoteClusters: jest.fn(),
    shareChannelWithRemote: jest.fn(),
    unshareChannelFromRemote: jest.fn(),
}));
jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
    dismissBottomSheet: jest.fn(),
    navigateBack: jest.fn(),
}));
jest.mock('@hooks/android_back_handler', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mock('@hooks/device', () => ({
    useIsTablet: jest.fn(() => false),
}));
jest.mock('@gorhom/bottom-sheet', () => ({
    BottomSheetScrollView: require('react-native').ScrollView,
}));

// Capture the setOptions mock from the global expo-router mock so individual tests can inspect it.
const mockSetOptions = jest.fn();
jest.mock('expo-router', () => ({
    router: {
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn(),
        canGoBack: jest.fn(() => true),
        canDismiss: jest.fn(() => true),
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        dismissTo: jest.fn(),
        setParams: jest.fn(),
        navigate: jest.fn(),
    },
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn(),
        canGoBack: jest.fn(() => true),
        navigate: jest.fn(),
    }),
    useNavigation: () => ({
        navigate: jest.fn(),
        goBack: jest.fn(),
        canGoBack: jest.fn(() => true),
        setOptions: mockSetOptions,
        setParams: jest.fn(),
        getState: jest.fn(() => ({})),
        addListener: jest.fn(() => jest.fn()),
    }),
    useSegments: () => [],
}));

function getHeaderRight() {
    const calls = mockSetOptions.mock.calls.filter((c) => c[0]?.headerRight);
    const last = calls[calls.length - 1];
    return last?.[0].headerRight?.() ?? null;
}

describe('ChannelShare', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(fetchRemoteClusters).mockResolvedValue({remoteClusters: []});
        jest.mocked(fetchChannelSharedRemotes).mockResolvedValue({remotes: []});
    });

    it('should render screen and scroll view after load', async () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <ChannelShare
                channelId='channel1'
                displayName='Test Channel'
            />,
        );
        await waitFor(() => {
            expect(getByTestId('channel_share.screen')).toBeTruthy();
        });
        expect(getByTestId('channel_share.scroll_view')).toBeTruthy();
    });

    it('should load data correctly: fetches remotes and channel shared remotes then shows content', async () => {
        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(
            <ChannelShare
                channelId='ch1'
                displayName='My Channel'
            />,
        );
        expect(fetchRemoteClusters).toHaveBeenCalledWith(serverUrl);
        expect(fetchChannelSharedRemotes).toHaveBeenCalledWith(serverUrl, 'ch1');
        await waitFor(() => {
            expect(queryByTestId('channel_share.scroll_view')).toBeTruthy();
        });
        expect(getByTestId('channel_share.screen')).toBeTruthy();
    });

    it('should show fetch error UI when fetchRemoteClusters returns error', async () => {
        const errorMessage = 'Remotes fetch failed';
        jest.mocked(fetchRemoteClusters).mockResolvedValue({error: new Error(errorMessage)});
        jest.mocked(fetchChannelSharedRemotes).mockResolvedValue({remotes: []});

        const {getByTestId, getByText, queryByTestId} = renderWithIntlAndTheme(
            <ChannelShare
                channelId='channel1'
                displayName='Test Channel'
            />,
        );

        await waitFor(() => {
            expect(getByTestId('channel_share.fetch_error')).toBeTruthy();
        });
        expect(getByText('Failed to load connected workspaces or connections')).toBeTruthy();
        expect(getByText(errorMessage)).toBeTruthy();
        expect(queryByTestId('channel_share.scroll_view')).toBeNull();
    });

    it('should show fetch error UI when fetchChannelSharedRemotes returns error', async () => {
        const errorMessage = 'Channel remotes fetch failed';
        jest.mocked(fetchRemoteClusters).mockResolvedValue({remoteClusters: []});
        jest.mocked(fetchChannelSharedRemotes).mockResolvedValue({error: new Error(errorMessage)});

        const {getByTestId, getByText, queryByTestId} = renderWithIntlAndTheme(
            <ChannelShare
                channelId='channel1'
                displayName='Test Channel'
            />,
        );

        await waitFor(() => {
            expect(getByTestId('channel_share.fetch_error')).toBeTruthy();
        });
        expect(getByText('Failed to load connected workspaces or connections')).toBeTruthy();
        expect(getByText(errorMessage)).toBeTruthy();
        expect(queryByTestId('channel_share.scroll_view')).toBeNull();
    });

    it('should set navigation header title to channel display name via setOptions', async () => {
        renderWithIntlAndTheme(
            <ChannelShare
                channelId='channel1'
                displayName='Expected Title Here'
            />,
        );
        await waitFor(() => {
            expect(mockSetOptions).toHaveBeenCalledWith(
                expect.objectContaining({
                    headerTitle: expect.any(Function),
                }),
            );
        });

        // The subtitle rendered inside the headerTitle component should contain the display name.
        const headerTitleCall = mockSetOptions.mock.calls.find((c) => c[0]?.headerTitle);
        const HeaderTitle = headerTitleCall?.[0].headerTitle;
        const {getByText} = renderWithIntlAndTheme(<HeaderTitle/>);
        expect(getByText('Expected Title Here')).toBeTruthy();
    });

    it('should show no-remotes message when there are no connected workspaces', async () => {
        jest.mocked(fetchRemoteClusters).mockResolvedValue({remoteClusters: []});
        jest.mocked(fetchChannelSharedRemotes).mockResolvedValue({remotes: []});
        const {getByTestId} = renderWithIntlAndTheme(
            <ChannelShare
                channelId='channel1'
                displayName='Test Channel'
            />,
        );
        await waitFor(() => {
            expect(getByTestId('channel_share.no_remotes_warning')).toBeTruthy();
        });
        expect(getByTestId('channel_share.toggle')).toBeTruthy();
    });

    it('should call shareChannelWithRemote for pending workspace when save button is pressed', async () => {
        const r1 = TestHelper.fakeRemoteClusterInfo({remote_id: 'r1', display_name: 'Remote 1'});
        const r2 = TestHelper.fakeRemoteClusterInfo({remote_id: 'r2', display_name: 'Remote 2'});
        jest.mocked(fetchRemoteClusters).mockResolvedValue({remoteClusters: [r1, r2]});
        jest.mocked(fetchChannelSharedRemotes).mockResolvedValue({
            remotes: [{...r1, last_ping_at: r1.last_ping_at}],
        });
        jest.mocked(shareChannelWithRemote).mockResolvedValue({});

        const {getByTestId} = renderWithIntlAndTheme(
            <ChannelShare
                channelId='channel1'
                displayName='Test Channel'
            />,
        );
        await waitFor(() => {
            expect(getByTestId('channel_share.add_workspace.button')).toBeTruthy();
        });

        const {bottomSheet} = require('@screens/navigation');
        act(() => {
            fireEvent.press(getByTestId('channel_share.add_workspace.button'));
        });
        const renderContent = jest.mocked(bottomSheet).mock.calls[0][0];
        const sheetContent = renderContent();
        const {getByTestId: getByTestIdSheet} = renderWithIntlAndTheme(sheetContent);
        act(() => {
            fireEvent.press(getByTestIdSheet('channel_share.workspace_option.r2'));
        });

        await waitFor(() => {
            expect(getHeaderRight()).not.toBeNull();
        });
        const saveButton = getHeaderRight();
        const {getByTestId: getByTestIdHeader} = renderWithIntlAndTheme(saveButton);
        act(() => {
            fireEvent.press(getByTestIdHeader('channel_share.save.button'));
        });

        await waitFor(() => {
            expect(shareChannelWithRemote).toHaveBeenCalledWith(serverUrl, 'channel1', 'r2');
        });
    });

    it('should render toggle, list title, workspace items and Add workspace button when data has remotes', async () => {
        const r1 = TestHelper.fakeRemoteClusterInfo({remote_id: 'r1', display_name: 'Remote 1'});
        const r2 = TestHelper.fakeRemoteClusterInfo({remote_id: 'r2', display_name: 'Remote 2'});
        jest.mocked(fetchRemoteClusters).mockResolvedValue({remoteClusters: [r1, r2]});
        jest.mocked(fetchChannelSharedRemotes).mockResolvedValue({
            remotes: [
                {...r1, last_ping_at: r1.last_ping_at},
                {...r2, last_ping_at: r2.last_ping_at},
            ],
        });
        const {getByTestId, getByText} = renderWithIntlAndTheme(
            <ChannelShare
                channelId='channel1'
                displayName='Test Channel'
            />,
        );
        await waitFor(() => {
            expect(getByTestId('channel_share.screen')).toBeTruthy();
        });
        expect(getByTestId('channel_share.toggle')).toBeTruthy();
        expect(getByText('Workspaces this channel is shared with')).toBeTruthy();
        expect(getByText('Remote 1')).toBeTruthy();
        expect(getByText('Remote 2')).toBeTruthy();
        expect(getByTestId('channel_share.remove.r1')).toBeTruthy();
        expect(getByTestId('channel_share.remove.r2')).toBeTruthy();
        expect(getByTestId('channel_share.add_workspace.button')).toBeTruthy();
    });

    it('should show "not shared yet" list title when toggle is on and no workspaces added', async () => {
        const remote = TestHelper.fakeRemoteClusterInfo({remote_id: 'r1', display_name: 'Remote 1'});
        jest.mocked(fetchRemoteClusters).mockResolvedValue({remoteClusters: [remote]});
        jest.mocked(fetchChannelSharedRemotes).mockResolvedValue({remotes: []});
        const {getByTestId, getByText} = renderWithIntlAndTheme(
            <ChannelShare
                channelId='channel1'
                displayName='Test Channel'
            />,
        );
        await waitFor(() => {
            expect(getByTestId('channel_share.toggle')).toBeTruthy();
        });
        const toggleSwitch = getByTestId('channel_share.toggle.toggled.false.button');
        act(() => {
            fireEvent(toggleSwitch, 'valueChange', true);
        });
        expect(getByText('This channel is not shared with any connected workspaces yet.')).toBeTruthy();
        expect(getByTestId('channel_share.add_workspace.button')).toBeTruthy();
    });

    it('should remove pending workspace from list when remove button is pressed', async () => {
        const r1 = TestHelper.fakeRemoteClusterInfo({remote_id: 'r1', display_name: 'Remote 1'});
        const r2 = TestHelper.fakeRemoteClusterInfo({remote_id: 'r2', display_name: 'Remote 2'});
        jest.mocked(fetchRemoteClusters).mockResolvedValue({remoteClusters: [r1, r2]});
        jest.mocked(fetchChannelSharedRemotes).mockResolvedValue({
            remotes: [{...r1, last_ping_at: r1.last_ping_at}],
        });
        const {getByTestId, getByText, queryByText} = renderWithIntlAndTheme(
            <ChannelShare
                channelId='channel1'
                displayName='Test Channel'
            />,
        );
        await waitFor(() => {
            expect(getByText('Remote 1')).toBeTruthy();
        });
        act(() => {
            fireEvent.press(getByTestId('channel_share.add_workspace.button'));
        });
        const {bottomSheet} = require('@screens/navigation');
        const renderContent = jest.mocked(bottomSheet).mock.calls[0][0];
        const sheetElement = renderContent();
        act(() => {
            sheetElement.props.onSelect(r2);
        });
        await waitFor(() => {
            expect(getByText('Remote 2')).toBeTruthy();
        });
        act(() => {
            fireEvent.press(getByTestId('channel_share.remove.r2'));
        });
        await waitFor(() => {
            expect(queryByText('Remote 2')).toBeNull();
        });
        expect(getByText('Remote 1')).toBeTruthy();
    });

    it('should disable add button and not open sheet while save is in progress', async () => {
        const r1 = TestHelper.fakeRemoteClusterInfo({remote_id: 'r1', display_name: 'Remote 1'});
        const r2 = TestHelper.fakeRemoteClusterInfo({remote_id: 'r2', display_name: 'Remote 2'});
        jest.mocked(fetchRemoteClusters).mockResolvedValue({remoteClusters: [r1, r2]});
        jest.mocked(fetchChannelSharedRemotes).mockResolvedValue({
            remotes: [{...r1, last_ping_at: r1.last_ping_at}],
        });
        jest.mocked(shareChannelWithRemote).mockImplementation(() => new Promise(() => {}));

        const {getByTestId} = renderWithIntlAndTheme(
            <ChannelShare
                channelId='channel1'
                displayName='Test Channel'
            />,
        );
        await waitFor(() => {
            expect(getByTestId('channel_share.add_workspace.button')).toBeTruthy();
        });

        const {bottomSheet} = require('@screens/navigation');
        act(() => {
            fireEvent.press(getByTestId('channel_share.add_workspace.button'));
        });
        const renderContent = jest.mocked(bottomSheet).mock.calls[0][0];
        const sheetContent = renderContent();
        const {getByTestId: getByTestIdSheet} = renderWithIntlAndTheme(sheetContent);
        act(() => {
            fireEvent.press(getByTestIdSheet('channel_share.workspace_option.r2'));
        });

        await waitFor(() => {
            expect(getHeaderRight()).not.toBeNull();
        });
        const saveButton = getHeaderRight();
        const {getByTestId: getByTestIdHeader} = renderWithIntlAndTheme(saveButton);
        act(() => {
            fireEvent.press(getByTestIdHeader('channel_share.save.button'));
        });

        jest.mocked(bottomSheet).mockClear();

        // While saving, pressing add should not open a new bottom sheet
        await waitFor(() => {
            expect(getByTestId('channel_share.add_workspace.button')).toBeTruthy();
        });
        act(() => {
            fireEvent.press(getByTestId('channel_share.add_workspace.button'));
        });
        expect(bottomSheet).toHaveBeenCalledTimes(0);
    });
});

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {
    fetchChannelSharedRemotes,
    fetchRemoteClusters,
    shareChannelWithRemote,
} from '@actions/remote/channel';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {act, fireEvent, renderWithIntlAndTheme, waitFor} from '@test/intl-test-helper';
import {getLastCallForButton} from '@test/mock_helpers';
import TestHelper from '@test/test_helper';
import {mergeNavigationOptions} from '@utils/navigation';

import ChannelShare from './channel_share';

const serverUrl = 'https://server.test';
const componentId = 'ChannelShare' as const;

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
    mergeNavigationOptions: jest.fn(),
    popTopScreen: jest.fn(),
    setButtons: jest.fn(),
    bottomSheet: jest.fn(),
    dismissBottomSheet: jest.fn(),
    buildNavigationButton: jest.fn(() => ({enabled: true, showAsAction: 'always', color: '#000'})),
}));
jest.mock('@utils/navigation', () => ({
    mergeNavigationOptions: jest.fn(),
}));
jest.mock('@hooks/android_back_handler', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mock('@hooks/navigation_button_pressed', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mock('@hooks/device', () => ({
    useIsTablet: jest.fn(() => false),
}));
jest.mock('@managers/security_manager', () => ({
    getShieldScreenId: jest.fn(() => 'shield-id'),
}));
jest.mock('@gorhom/bottom-sheet', () => ({
    BottomSheetScrollView: require('react-native').ScrollView,
}));

describe('ChannelShare', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(fetchRemoteClusters).mockResolvedValue({remoteClusters: []});
        jest.mocked(fetchChannelSharedRemotes).mockResolvedValue({remotes: []});
    });

    it('renders screen and scroll view after load', async () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <ChannelShare
                channelId='channel1'
                componentId={componentId}
                displayName='Test Channel'
            />,
        );
        await waitFor(() => {
            expect(getByTestId('channel_share.screen')).toBeTruthy();
        });
        expect(getByTestId('channel_share.scroll_view')).toBeTruthy();
    });

    it('loads data correctly: fetches remotes and channel shared remotes then shows content', async () => {
        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(
            <ChannelShare
                channelId='ch1'
                componentId={componentId}
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

    it('sets navigation title (subtitle) to channel display name', async () => {
        renderWithIntlAndTheme(
            <ChannelShare
                channelId='channel1'
                componentId={componentId}
                displayName='Expected Title Here'
            />,
        );
        await waitFor(() => {
            expect(mergeNavigationOptions).toHaveBeenCalledWith(
                componentId,
                expect.objectContaining({
                    topBar: expect.objectContaining({
                        subtitle: expect.objectContaining({
                            text: 'Expected Title Here',
                        }),
                    }),
                }),
            );
        });
    });

    it('shows no-remotes message when there are no connected workspaces', async () => {
        jest.mocked(fetchRemoteClusters).mockResolvedValue({remoteClusters: []});
        jest.mocked(fetchChannelSharedRemotes).mockResolvedValue({remotes: []});
        const {getByText, getByTestId} = renderWithIntlAndTheme(
            <ChannelShare
                channelId='channel1'
                componentId={componentId}
                displayName='Test Channel'
            />,
        );
        await waitFor(() => {
            expect(getByText('No connected workspaces are available. Contact your system admin to add one.')).toBeTruthy();
        });
        expect(getByTestId('channel_share.toggle')).toBeTruthy();
    });

    it('save calls shareChannelWithRemote for pending workspace', async () => {
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
                componentId={componentId}
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
        const renderContent = jest.mocked(bottomSheet).mock.calls[0][0].renderContent;
        const sheetContent = renderContent();
        const {getByTestId: getByTestIdSheet} = renderWithIntlAndTheme(sheetContent);
        act(() => {
            fireEvent.press(getByTestIdSheet('channel_share.workspace_option.r2'));
        });

        const lastCall = getLastCallForButton(jest.mocked(useNavButtonPressed), 'save-channel-share');
        const saveCallback = lastCall[2];
        expect(saveCallback).toBeDefined();
        act(() => {
            saveCallback();
        });

        await waitFor(() => {
            expect(shareChannelWithRemote).toHaveBeenCalledWith(serverUrl, 'channel1', 'r2');
        });
    });

    it('renders toggle, list title, workspace items and Add workspace button when data has remotes', async () => {
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
                componentId={componentId}
                displayName='Test Channel'
            />,
        );
        await waitFor(() => {
            expect(getByTestId('channel_share.screen')).toBeTruthy();
        });
        expect(getByTestId('channel_share.toggle')).toBeTruthy();
        expect(getByText('Workspaces sharing this channel')).toBeTruthy();
        expect(getByText('Remote 1')).toBeTruthy();
        expect(getByText('Remote 2')).toBeTruthy();
        expect(getByTestId('channel_share.remove.r1')).toBeTruthy();
        expect(getByTestId('channel_share.remove.r2')).toBeTruthy();
        expect(getByTestId('channel_share.add_workspace.button')).toBeTruthy();
    });

    it('shows list title "No workspaces sharing this channel yet." when toggle is on and no workspaces added', async () => {
        const remote = TestHelper.fakeRemoteClusterInfo({remote_id: 'r1', display_name: 'Remote 1'});
        jest.mocked(fetchRemoteClusters).mockResolvedValue({remoteClusters: [remote]});
        jest.mocked(fetchChannelSharedRemotes).mockResolvedValue({remotes: []});
        const {getByTestId, getByText} = renderWithIntlAndTheme(
            <ChannelShare
                channelId='channel1'
                componentId={componentId}
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
        expect(getByText('No workspaces sharing this channel yet.')).toBeTruthy();
        expect(getByTestId('channel_share.add_workspace.button')).toBeTruthy();
    });

    it('removeWorkspace removes pending workspace from list', async () => {
        const r1 = TestHelper.fakeRemoteClusterInfo({remote_id: 'r1', display_name: 'Remote 1'});
        const r2 = TestHelper.fakeRemoteClusterInfo({remote_id: 'r2', display_name: 'Remote 2'});
        jest.mocked(fetchRemoteClusters).mockResolvedValue({remoteClusters: [r1, r2]});
        jest.mocked(fetchChannelSharedRemotes).mockResolvedValue({
            remotes: [{...r1, last_ping_at: r1.last_ping_at}],
        });
        const {getByTestId, getByText, queryByText} = renderWithIntlAndTheme(
            <ChannelShare
                channelId='channel1'
                componentId={componentId}
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
        const renderContent = jest.mocked(bottomSheet).mock.calls[0][0].renderContent;
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
});

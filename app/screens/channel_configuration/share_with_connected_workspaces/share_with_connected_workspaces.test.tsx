// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {fetchChannelSharedRemotes} from '@actions/remote/channel';
import {Screens} from '@constants';
import {goToScreen} from '@screens/navigation';
import {fireEvent, renderWithIntlAndTheme, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ShareWithConnectedWorkspaces from './share_with_connected_workspaces';

const serverUrl = 'https://server.test';

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => serverUrl),
}));
jest.mock('@actions/remote/channel', () => ({
    fetchChannelSharedRemotes: jest.fn(),
}));
jest.mock('@screens/navigation', () => ({
    goToScreen: jest.fn(),
}));
jest.mock('@hooks/utils', () => ({
    usePreventDoubleTap: (fn: () => void) => fn,
}));

describe('ShareWithConnectedWorkspaces', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows loading description and Off initially', () => {
        jest.mocked(fetchChannelSharedRemotes).mockImplementation(() => new Promise(() => {}));
        const {getByText} = renderWithIntlAndTheme(
            <ShareWithConnectedWorkspaces
                channelId='channel1'
                isChannelShared={false}
                channelDisplayName='Channel 1'
            />,
        );
        expect(getByText('Loading…')).toBeTruthy();
        expect(getByText('Off')).toBeTruthy();
    });

    it('shows load error description when fetch fails', async () => {
        jest.mocked(fetchChannelSharedRemotes).mockResolvedValue({error: new Error('network')});
        const {getByText} = renderWithIntlAndTheme(
            <ShareWithConnectedWorkspaces
                channelId='channel1'
                isChannelShared={false}
                channelDisplayName='Channel 1'
            />,
        );
        await waitFor(() => {
            expect(getByText('Could not load connection count')).toBeTruthy();
        });
    });

    it('shows shared count and On when fetch succeeds and isChannelShared', async () => {
        const remotes = [
            TestHelper.fakeRemoteClusterInfo({remote_id: 'r1', name: 'Remote 1', site_url: 'https://r1.com'}),
            TestHelper.fakeRemoteClusterInfo({remote_id: 'r2', name: 'Remote 2', site_url: 'https://r2.com'}),
        ];
        jest.mocked(fetchChannelSharedRemotes).mockResolvedValue({remotes});
        const {getByText} = renderWithIntlAndTheme(
            <ShareWithConnectedWorkspaces
                channelId='channel1'
                isChannelShared={true}
                channelDisplayName='Channel 1'
            />,
        );
        await waitFor(() => {
            expect(getByText('Shared with 2 connections')).toBeTruthy();
        });
        expect(getByText('On')).toBeTruthy();
    });

    it('shows On when channel is shared with one connection', async () => {
        const remotes = [TestHelper.fakeRemoteClusterInfo({remote_id: 'r1', name: 'Remote 1', site_url: 'https://r1.com'})];
        jest.mocked(fetchChannelSharedRemotes).mockResolvedValue({remotes});
        const {getByText} = renderWithIntlAndTheme(
            <ShareWithConnectedWorkspaces
                channelId='channel1'
                isChannelShared={true}
                channelDisplayName='Channel 1'
            />,
        );
        await waitFor(() => {
            expect(getByText('Shared with 1 connection')).toBeTruthy();
        });
        expect(getByText('On')).toBeTruthy();
    });

    it('shows Off when channel is not shared', async () => {
        // The server should never return the list of remotes if it is not shared
        // but we want to test the case where it does
        const remotes = [TestHelper.fakeRemoteClusterInfo({remote_id: 'r1', name: 'Remote 1', site_url: 'https://r1.com'})];
        jest.mocked(fetchChannelSharedRemotes).mockResolvedValue({remotes});
        const {getByText} = renderWithIntlAndTheme(
            <ShareWithConnectedWorkspaces
                channelId='channel1'
                isChannelShared={false}
                channelDisplayName='Channel 1'
            />,
        );
        await waitFor(() => {
            expect(fetchChannelSharedRemotes).toHaveBeenCalledWith(serverUrl, 'channel1');
        });
        expect(getByText('Off')).toBeTruthy();
    });

    it('shows Off when channel is shared but has no connections', async () => {
        jest.mocked(fetchChannelSharedRemotes).mockResolvedValue({remotes: []});
        const {getByText} = renderWithIntlAndTheme(
            <ShareWithConnectedWorkspaces
                channelId='channel1'
                isChannelShared={true}
                channelDisplayName='Channel 1'
            />,
        );
        await waitFor(() => {
            expect(fetchChannelSharedRemotes).toHaveBeenCalledWith(serverUrl, 'channel1');
        });
        expect(getByText('Off')).toBeTruthy();
    });

    it('shows Off when fetch fails', async () => {
        jest.mocked(fetchChannelSharedRemotes).mockResolvedValue({error: new Error('network')});
        const {getByText} = renderWithIntlAndTheme(
            <ShareWithConnectedWorkspaces
                channelId='channel1'
                isChannelShared={true}
                channelDisplayName='Channel 1'
            />,
        );
        await waitFor(() => {
            expect(getByText('Could not load connection count')).toBeTruthy();
        });
        expect(getByText('Off')).toBeTruthy();
    });

    it('calls goToScreen with CHANNEL_SHARE when option is pressed', async () => {
        jest.mocked(fetchChannelSharedRemotes).mockResolvedValue({remotes: []});
        const {getByTestId} = renderWithIntlAndTheme(
            <ShareWithConnectedWorkspaces
                channelId='channel1'
                isChannelShared={false}
                channelDisplayName='Channel 1'
            />,
        );
        await waitFor(() => {
            expect(fetchChannelSharedRemotes).toHaveBeenCalledWith(serverUrl, 'channel1');
        });
        const option = getByTestId('channel_settings.share_with_connected_workspaces.option');
        fireEvent.press(option);
        expect(goToScreen).toHaveBeenCalledWith(
            Screens.CHANNEL_SHARE,
            'Share with connected workspaces',
            {channelId: 'channel1', onSharedRemotesChanged: expect.any(Function)},
            {topBar: {subtitle: {color: 'rgba(255,255,255,0.72)', text: 'Channel 1'}}},
        );
    });
});

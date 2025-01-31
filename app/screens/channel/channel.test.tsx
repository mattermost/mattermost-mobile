// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, screen} from '@testing-library/react-native';
import React from 'react';
import {Navigation} from 'react-native-navigation';

import {storeLastViewedChannelIdAndServer} from '@actions/app/global';
import {useChannelSwitch} from '@hooks/channel_switch';
import {useIsTablet} from '@hooks/device';
import {useTeamSwitch} from '@hooks/team_switch';
import {renderWithEverything} from '@test/intl-test-helper';
import {Channel as ChannelType} from '@typings/database/models/servers/channel';

import Channel from './channel';

jest.mock('@actions/app/global', () => ({
    storeLastViewedChannelIdAndServer: jest.fn(),
    removeLastViewedChannelIdAndServer: jest.fn(),
}));

jest.mock('@hooks/device', () => ({
    useIsTablet: jest.fn().mockReturnValue(false),
}));

jest.mock('@hooks/channel_switch', () => ({
    useChannelSwitch: jest.fn().mockReturnValue(false),
}));

jest.mock('@hooks/team_switch', () => ({
    useTeamSwitch: jest.fn().mockReturnValue(false),
}));

jest.mock('react-native-navigation', () => ({
    Navigation: {
        events: jest.fn().mockReturnValue({
            registerComponentListener: jest.fn().mockReturnValue({
                remove: jest.fn(),
            }),
        }),
    },
}));

describe('Channel', () => {
    const baseProps = {
        channelId: 'channel-id',
        componentId: 'component-id',
        showJoinCallBanner: false,
        isInACall: false,
        isCallsEnabledInChannel: true,
        groupCallsAllowed: true,
        showIncomingCalls: false,
        isTabletView: false,
        dismissedGMasDMNotice: [],
        currentUserId: 'current-user-id',
        channelType: 'O' as ChannelType,
        hasGMasDMFeature: true,
        includeBookmarkBar: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders channel screen correctly', async () => {
        const {database} = await renderWithEverything(
            <Channel {...baseProps}/>,
        );

        expect(screen.getByTestId('channel.screen')).toBeTruthy();
        expect(storeLastViewedChannelIdAndServer).toHaveBeenCalledWith(baseProps.channelId);
        expect(Navigation.events().registerComponentListener).toHaveBeenCalled();
        expect(database).toBeTruthy();
    });

    it('shows floating call container when in a call', async () => {
        await renderWithEverything(
            <Channel 
                {...baseProps}
                isInACall={true}
            />,
        );

        // Wait for posts to render
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(screen.getByTestId('floating_call_container')).toBeTruthy();
    });

    it('shows floating call container with join banner', async () => {
        await renderWithEverything(
            <Channel 
                {...baseProps}
                showJoinCallBanner={true}
            />,
        );

        // Wait for posts to render
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(screen.getByTestId('floating_call_container')).toBeTruthy();
    });

    it('handles tablet view correctly', async () => {
        const mockedIsTablet = jest.mocked(useIsTablet);
        mockedIsTablet.mockReturnValue(true);

        await renderWithEverything(
            <Channel 
                {...baseProps}
                isTabletView={true}
            />,
        );

        expect(screen.getByTestId('channel.screen')).toBeTruthy();
    });

    it('does not render posts while switching teams', async () => {
        const mockedTeamSwitch = jest.mocked(useTeamSwitch);
        mockedTeamSwitch.mockReturnValue(true);

        await renderWithEverything(
            <Channel {...baseProps}/>,
        );

        expect(screen.queryByTestId('channel.post_draft')).toBeNull();
    });

    it('does not render posts while switching channels', async () => {
        const mockedChannelSwitch = jest.mocked(useChannelSwitch);
        mockedChannelSwitch.mockReturnValue(true);

        await renderWithEverything(
            <Channel {...baseProps}/>,
        );

        expect(screen.queryByTestId('channel.post_draft')).toBeNull();
    });
});

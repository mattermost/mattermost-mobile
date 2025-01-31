// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {act, screen} from '@testing-library/react-native';
import {Navigation} from 'react-native-navigation';

import {storeLastViewedChannelIdAndServer} from '@actions/app/global';
import {useChannelSwitch} from '@hooks/channel_switch';
import {useIsTablet} from '@hooks/device';
import {useTeamSwitch} from '@hooks/team_switch';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Channel from './channel';

import type Database from '@nozbe/watermelondb/Database';
import type {AvailableScreens} from '@typings/screens/navigation';

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

jest.mock('@react-native-camera-roll/camera-roll', () => ({
    CameraRoll: {
        save: jest.fn().mockResolvedValue('path'),
    },
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

function getBaseProps() {
    return {
        channelId: 'channel-id',
        componentId: 'component-id' as AvailableScreens,
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
}

describe('Channel', () => {
    let database: Database;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should match snapshot', async () => {
        const wrapper = renderWithEverything(
            <Channel {...getBaseProps()}/>,
            {database},
        );
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('renders channel screen correctly', async () => {
        let wrapper;
        await act(async () => {
            wrapper = renderWithEverything(
                <Channel {...getBaseProps()}/>,
                {database},
            );
        });

        expect(wrapper.getByTestId('channel.screen')).toBeTruthy();
        expect(storeLastViewedChannelIdAndServer).toHaveBeenCalledWith(getBaseProps().channelId);
        expect(Navigation.events().registerComponentListener).toHaveBeenCalled();
    });

    it('shows floating call container when in a call', async () => {
        const props = getBaseProps();
        props.isInACall = true;

        renderWithEverything(
            <Channel {...props}/>,
            {database},
        );

        // Wait for posts to render
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(screen.getByTestId('floating_call_container')).toBeTruthy();
    });

    it('shows floating call container with join banner', async () => {
        const props = getBaseProps();
        props.showJoinCallBanner = true;

        renderWithEverything(
            <Channel {...props}/>,
            {database},
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

        const props = getBaseProps();
        props.isTabletView = true;

        renderWithEverything(
            <Channel {...props}/>,
            {database},
        );

        expect(screen.getByTestId('channel.screen')).toBeTruthy();
    });

    it('does not render posts while switching teams', async () => {
        const mockedTeamSwitch = jest.mocked(useTeamSwitch);
        mockedTeamSwitch.mockReturnValue(true);

        renderWithEverything(
            <Channel {...getBaseProps()}/>,
            {database},
        );

        expect(screen.queryByTestId('channel.post_draft')).toBeNull();
    });

    it('does not render posts while switching channels', async () => {
        const mockedChannelSwitch = jest.mocked(useChannelSwitch);
        mockedChannelSwitch.mockReturnValue(true);

        renderWithEverything(
            <Channel {...getBaseProps()}/>,
            {database},
        );

        expect(screen.queryByTestId('channel.post_draft')).toBeNull();
    });
});

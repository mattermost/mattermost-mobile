// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {Screens} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import ChannelAutotranslation from './channel_autotranslation';
import ChannelConfiguration from './channel_configuration';
import ShareWithConnectedWorkspaces from './share_with_connected_workspaces';

jest.mock('@screens/navigation', () => ({
    mergeNavigationOptions: jest.fn(),
    popTopScreen: jest.fn(),
}));
jest.mock('react-native-navigation', () => ({
    Navigation: {
        events: () => ({
            registerComponentListener: () => ({remove: jest.fn()}),
        }),
    },
}));
jest.mock('@utils/navigation', () => ({
    mergeNavigationOptions: jest.fn(),
}));
jest.mock('@hooks/android_back_handler', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mock('@managers/security_manager', () => ({
    getShieldScreenId: jest.fn(() => 'shield-screen-id'),
}));
jest.mock('./channel_autotranslation', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(ChannelAutotranslation).mockImplementation(
    (props) => React.createElement(View, {testID: 'channel_configuration.autotranslation', ...props}),
);
jest.mock('./share_with_connected_workspaces', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(ShareWithConnectedWorkspaces).mockImplementation(
    (props) => React.createElement(View, {testID: 'channel_configuration.share_workspaces', ...props}),
);

describe('ChannelConfiguration', () => {
    const baseProps = {
        canManageAutotranslations: false,
        canManageSharedChannel: false,
        channelId: 'channel1',
        componentId: Screens.CHANNEL_CONFIGURATION as 'ChannelConfiguration',
        displayName: 'Test Channel',
        isChannelShared: false,
    };

    it('renders screen and scroll view with testIDs', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <ChannelConfiguration {...baseProps}/>,
        );
        expect(getByTestId('channel_configuration.screen')).toBeTruthy();
        expect(getByTestId('channel_configuration.scroll_view')).toBeTruthy();
    });

    it('renders ChannelAutotranslation when canManageAutotranslations is true', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <ChannelConfiguration
                {...baseProps}
                canManageAutotranslations={true}
            />,
        );
        expect(getByTestId('channel_configuration.autotranslation')).toBeTruthy();
    });

    it('renders ShareWithConnectedWorkspaces when canManageSharedChannel is true', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <ChannelConfiguration
                {...baseProps}
                canManageSharedChannel={true}
            />,
        );
        expect(getByTestId('channel_configuration.share_workspaces')).toBeTruthy();
    });

    it('renders both children when both permissions are true', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <ChannelConfiguration
                {...baseProps}
                canManageAutotranslations={true}
                canManageSharedChannel={true}
            />,
        );
        expect(getByTestId('channel_configuration.autotranslation')).toBeTruthy();
        expect(getByTestId('channel_configuration.share_workspaces')).toBeTruthy();
    });

    it('renders neither child when both permissions are false', () => {
        const {queryByTestId} = renderWithIntlAndTheme(
            <ChannelConfiguration {...baseProps}/>,
        );
        expect(queryByTestId('channel_configuration.autotranslation')).toBeNull();
        expect(queryByTestId('channel_configuration.share_workspaces')).toBeNull();
    });
});

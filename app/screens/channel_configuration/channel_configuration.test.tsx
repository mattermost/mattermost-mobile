// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';
import {View} from 'react-native';

import ReadOnlyNotice from '@screens/channel_settings/read_only_notice';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import ChannelAutotranslation from './channel_autotranslation';
import ChannelConfiguration from './channel_configuration';
import ShareWithConnectedWorkspaces from './share_with_connected_workspaces';

jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
}));
jest.mock('@hooks/android_back_handler', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mock('./channel_autotranslation', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(ChannelAutotranslation).mockImplementation(
    (props: ComponentProps<typeof ChannelAutotranslation>) => React.createElement(View, {testID: 'channel_configuration.autotranslation', ...props}),
);
jest.mock('./share_with_connected_workspaces', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(ShareWithConnectedWorkspaces).mockImplementation(
    (props: ComponentProps<typeof ShareWithConnectedWorkspaces>) => React.createElement(View, {testID: 'channel_configuration.share_workspaces', ...props}),
);
jest.mock('@screens/channel_settings/read_only_notice', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(ReadOnlyNotice).mockImplementation(
    (props: ComponentProps<typeof ReadOnlyNotice>) => React.createElement(View, props),
);

describe('ChannelConfiguration', () => {
    const baseProps = {
        canManageAutotranslations: false,
        canManageSharedChannel: false,
        channelId: 'channel1',
        displayName: 'Test Channel',
        isChannelShared: false,
        isReadOnly: false,
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

    it('should show the read-only notice and disable both options only while read-only', () => {
        const props = {...baseProps, canManageAutotranslations: true, canManageSharedChannel: true, isReadOnly: true};
        const {getByTestId, queryByTestId, rerender} = renderWithIntlAndTheme(
            <ChannelConfiguration {...props}/>,
        );
        expect(getByTestId('channel_configuration.read_only_notice')).toBeTruthy();
        expect(getByTestId('channel_configuration.autotranslation')).toHaveProp('disabled', true);
        expect(getByTestId('channel_configuration.share_workspaces')).toHaveProp('disabled', true);

        rerender(
            <ChannelConfiguration
                {...props}
                isReadOnly={false}
            />,
        );
        expect(queryByTestId('channel_configuration.read_only_notice')).toBeNull();
        expect(getByTestId('channel_configuration.autotranslation')).toHaveProp('disabled', false);
        expect(getByTestId('channel_configuration.share_workspaces')).toHaveProp('disabled', false);
    });
});

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import DestructiveOptions from './index';

jest.mock('@components/channel_actions/leave_channel_label', () => jest.fn(() => null));

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => 'https://channel-info.test.com'),
}));

jest.mock('@hooks/utils', () => ({
    usePreventDoubleTap: jest.fn((callback) => callback),
}));

describe('ChannelInfo DestructiveOptions', () => {
    it('shows permanent deletion directly in Channel Info when permitted', () => {
        renderWithIntlAndTheme(
            <DestructiveOptions
                canPermanentlyDelete={true}
                channelDisplayName='Test Channel'
                channelId='channelid1'
                type='O'
            />,
        );

        expect(screen.getByTestId('channel_settings.permanent_delete.option')).toBeTruthy();
        expect(screen.getByText('Delete Channel Permanently')).toBeTruthy();
    });

    it('does not show permanent deletion when the channel is not eligible', () => {
        renderWithIntlAndTheme(
            <DestructiveOptions
                canPermanentlyDelete={false}
                channelDisplayName='Direct Message'
                channelId='channelid1'
                type='D'
            />,
        );

        expect(screen.queryByTestId('channel_settings.permanent_delete.option')).toBeNull();
    });
});

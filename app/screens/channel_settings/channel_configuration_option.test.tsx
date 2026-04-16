// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Screens} from '@constants';
import {goToScreen} from '@screens/navigation';
import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';

import ChannelConfigurationOption from './channel_configuration_option';

jest.mock('@screens/navigation', () => ({
    goToScreen: jest.fn(),
}));
jest.mock('@hooks/utils', () => ({
    usePreventDoubleTap: (fn: () => void) => fn,
}));

describe('ChannelConfigurationOption', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders option with Configuration label and testID', () => {
        const {getByTestId, getByText} = renderWithIntlAndTheme(
            <ChannelConfigurationOption
                channelId='channel1'
                channelDisplayName='Channel 1'
            />,
        );
        expect(getByTestId('channel_settings.configuration.option')).toBeTruthy();
        expect(getByText('Configuration')).toBeTruthy();
    });

    it('calls goToScreen with CHANNEL_CONFIGURATION when pressed', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <ChannelConfigurationOption
                channelId='channel-id-123'
                channelDisplayName='Channel 1'
            />,
        );
        fireEvent.press(getByTestId('channel_settings.configuration.option'));
        expect(goToScreen).toHaveBeenCalledWith(
            Screens.CHANNEL_CONFIGURATION,
            'Configuration',
            {channelId: 'channel-id-123'},
            {topBar: {subtitle: {color: 'rgba(255,255,255,0.72)', text: 'Channel 1'}}},
        );
    });
});

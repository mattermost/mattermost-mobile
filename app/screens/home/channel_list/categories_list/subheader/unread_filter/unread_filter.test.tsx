// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {showUnreadChannelsOnly} from '@actions/local/channel';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import UnreadFilter from './unread_filter';

jest.mock('expo-application', () => ({
    applicationId: 'com.encma.hxmain',
}));

jest.mock('@actions/local/channel', () => ({
    showUnreadChannelsOnly: jest.fn(),
}));

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => 'https://channel-list.test.com'),
}));

describe('ENCMA channel-list unread filter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('enables the unread-only filter with an accessible refined control', () => {
        renderWithIntlAndTheme(<UnreadFilter onlyUnreads={false}/>);

        const button = screen.getByTestId('channel_list_subheader.unread_filter.button');
        expect(button).toHaveProp('accessibilityRole', 'button');
        expect(button).toHaveProp('accessibilityLabel', 'Show unread channels only');
        expect(button).toHaveProp('accessibilityState', {selected: false});
        expect(screen.getByTestId('channel_list_subheader.unread_filter.surface')).toHaveStyle({
            borderRadius: 14,
            borderWidth: 1,
            height: 40,
            width: 40,
        });

        fireEvent.press(button);
        expect(showUnreadChannelsOnly).toHaveBeenCalledWith('https://channel-list.test.com', true);
    });

    it('offers to show all channels when the unread-only filter is active', () => {
        renderWithIntlAndTheme(<UnreadFilter onlyUnreads={true}/>);

        const button = screen.getByTestId('channel_list_subheader.unread_filter.button');
        expect(button).toHaveProp('accessibilityLabel', 'Show all channels');
        expect(button).toHaveProp('accessibilityState', {selected: true});

        fireEvent.press(button);
        expect(showUnreadChannelsOnly).toHaveBeenCalledWith('https://channel-list.test.com', false);
    });
});

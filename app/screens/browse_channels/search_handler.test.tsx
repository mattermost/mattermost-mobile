// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type Database} from '@nozbe/watermelondb';
import {act, fireEvent, waitFor} from '@testing-library/react-native';
import React from 'react';
import {ActivityIndicator} from 'react-native';

import {fetchArchivedChannels, fetchChannels, fetchSharedChannels, searchChannels} from '@actions/remote/channel';
import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';

import SearchHandler from './search_handler';

jest.mock('expo-router', () => ({
    useNavigation: jest.fn(() => ({
        setOptions: jest.fn(),
        getParent: () => ({goBack: jest.fn()}),
    })),
}));

jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
    navigateToScreenWithBaseRoute: jest.fn(),
}));

jest.mock('@hooks/android_back_handler', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('@actions/remote/channel', () => ({
    fetchChannels: jest.fn(),
    fetchSharedChannels: jest.fn(),
    fetchArchivedChannels: jest.fn(),
    searchChannels: jest.fn(),
    fetchMyChannel: jest.fn(),
    joinChannel: jest.fn(),
    switchToChannelById: jest.fn(),
}));

const serverUrl = 'https://browse.channels.test';

describe('SearchHandler', () => {
    let database: Database;

    beforeEach(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
        jest.mocked(fetchChannels).mockResolvedValue({channels: []});
        jest.mocked(fetchSharedChannels).mockResolvedValue({channels: []});
        jest.mocked(fetchArchivedChannels).mockResolvedValue({channels: []});
        jest.mocked(searchChannels).mockReturnValue(new Promise(() => {/* hang so search loading is not cleared by the request */}));
    });

    afterEach(async () => {
        disableFakeTimers();
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should clear loading when cancelling a search after pagination is exhausted', async () => {
        const {getByTestId, getByText, UNSAFE_queryByType} = renderWithEverything(
            <SearchHandler
                currentTeamId='team1'
                canCreateChannels={false}
                sharedChannelsEnabled={false}
                canShowArchivedChannels={false}
            />,
            {database, serverUrl},
        );

        await waitFor(() => expect(fetchChannels).toHaveBeenCalled());
        await waitFor(() => {
            // eslint-disable-next-line new-cap -- UNSAFE_queryByType is the RNTL API name
            expect(UNSAFE_queryByType(ActivityIndicator)).toBeNull();
        });

        enableFakeTimers();

        const input = getByTestId('browse_channels.search_bar.search.input');
        await act(async () => {
            fireEvent(input, 'focus');
            fireEvent.changeText(input, 'off-topic');
        });

        await act(async () => {
            await advanceTimers(500);
        });
        expect(searchChannels).toHaveBeenCalled();

        disableFakeTimers();

        await act(async () => {
            fireEvent.press(getByText('Cancel'));
        });

        await waitFor(() => {
            // eslint-disable-next-line new-cap -- UNSAFE_queryByType is the RNTL API name
            expect(UNSAFE_queryByType(ActivityIndicator)).toBeNull();
        });
    });
});

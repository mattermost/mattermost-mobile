// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert} from 'react-native';

import {setChannelAutotranslation} from '@actions/remote/channel';
import DatabaseManager from '@database/manager';
import {fireEvent, renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChannelAutotranslation from './channel_autotranslation';

const serverUrl = 'channel_autotranslation.test.com';

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn().mockReturnValue(serverUrl),
}));
jest.mock('@actions/remote/channel', () => ({
    setChannelAutotranslation: jest.fn(),
}));
jest.mock('@hooks/utils', () => ({
    usePreventDoubleTap: (fn: () => void) => fn,
}));

describe('ChannelAutotranslation', () => {
    let database: import('@nozbe/watermelondb').Database;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
        jest.clearAllMocks();
    });

    it('renders toggle with correct testID when enabled', () => {
        const {getByTestId} = renderWithEverything(
            <ChannelAutotranslation
                channelId='channel1'
                enabled={true}
                displayName='Test Channel'
            />,
            {database},
        );
        expect(getByTestId('channel_settings.channel_autotranslation.option.toggled.true')).toBeTruthy();
    });

    it('renders toggle with correct testID when disabled', () => {
        const {getByTestId} = renderWithEverything(
            <ChannelAutotranslation
                channelId='channel1'
                enabled={false}
                displayName='Test Channel'
            />,
            {database},
        );
        expect(getByTestId('channel_settings.channel_autotranslation.option.toggled.false')).toBeTruthy();
    });

    it('calls setChannelAutotranslation when toggling from off to on', async () => {
        jest.mocked(setChannelAutotranslation).mockResolvedValue({channel: TestHelper.fakeChannel({id: 'channel1'})});
        const {getByTestId} = renderWithEverything(
            <ChannelAutotranslation
                channelId='channel1'
                enabled={false}
                displayName='Test Channel'
            />,
            {database},
        );
        const toggle = getByTestId('channel_settings.channel_autotranslation.option.toggled.false.toggled.false.button');
        fireEvent(toggle, 'valueChange', true);
        await waitFor(() => {
            expect(setChannelAutotranslation).toHaveBeenCalledWith(serverUrl, 'channel1', true);
        });
    });

    it('calls alert when setting autotranslation fails', async () => {
        jest.mocked(setChannelAutotranslation).mockResolvedValue({error: 'error'});
        const {getByTestId} = renderWithEverything(
            <ChannelAutotranslation
                channelId='channel1'
                enabled={true}
                displayName='Test Channel'
            />,
            {database},
        );
        const toggle = getByTestId('channel_settings.channel_autotranslation.option.toggled.true.toggled.true.button');
        fireEvent(toggle, 'valueChange', false);
        await waitFor(() => {
            expect(Alert.alert).toHaveBeenCalledWith('', 'An error occurred trying to enable automatic translation for channel Test Channel', undefined);
            expect(getByTestId('channel_settings.channel_autotranslation.option.toggled.true.toggled.true.button')).toBeTruthy();
        });
    });
});

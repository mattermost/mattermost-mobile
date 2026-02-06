// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert} from 'react-native';

import {setMyChannelAutotranslation} from '@actions/remote/channel';
import DatabaseManager from '@database/manager';
import {act, fireEvent, renderWithEverything, waitFor} from '@test/intl-test-helper';

import MyAutotranslation from './my_autotranslation';

const serverUrl = 'my_autotranslation.test.com';

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn().mockReturnValue(serverUrl),
}));
jest.mock('@actions/remote/channel', () => ({
    setMyChannelAutotranslation: jest.fn(),
}));
jest.mock('@hooks/utils', () => ({
    usePreventDoubleTap: (fn: () => void) => fn,
}));
jest.mock('react-native/Libraries/Alert/Alert', () => ({
    alert: jest.fn(),
}));

describe('MyAutotranslation', () => {
    let database: import('@nozbe/watermelondb').Database;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
        jest.clearAllMocks();
    });

    it('returns null when channelAutotranslationEnabled is false', () => {
        const {queryByTestId} = renderWithEverything(
            <MyAutotranslation
                channelId='channel1'
                enabled={false}
                displayName='Test Channel'
                channelAutotranslationEnabled={false}
                isLanguageSupported={true}
            />,
            {database},
        );
        expect(queryByTestId('channel_info.options.my_autotranslation.option')).toBeNull();
    });

    it('renders disabled option when language is not supported', () => {
        const {getByTestId, getByText} = renderWithEverything(
            <MyAutotranslation
                channelId='channel1'
                enabled={false}
                displayName='Test Channel'
                channelAutotranslationEnabled={true}
                isLanguageSupported={false}
            />,
            {database},
        );
        expect(getByTestId('channel_info.options.my_autotranslation.option')).toBeTruthy();
        expect(getByText('Your language is not supported')).toBeTruthy();
    });

    it('renders toggle with correct testID when enabled', () => {
        const {getByTestId} = renderWithEverything(
            <MyAutotranslation
                channelId='channel1'
                enabled={true}
                displayName='Test Channel'
                channelAutotranslationEnabled={true}
                isLanguageSupported={true}
            />,
            {database},
        );
        expect(getByTestId('channel_info.options.my_autotranslation.option.toggled.true')).toBeTruthy();
    });

    it('renders toggle with correct testID when disabled', () => {
        const {getByTestId} = renderWithEverything(
            <MyAutotranslation
                channelId='channel1'
                enabled={false}
                displayName='Test Channel'
                channelAutotranslationEnabled={true}
                isLanguageSupported={true}
            />,
            {database},
        );
        expect(getByTestId('channel_info.options.my_autotranslation.option.toggled.false')).toBeTruthy();
    });

    it('calls setMyChannelAutotranslation when toggling from off to on', async () => {
        jest.mocked(setMyChannelAutotranslation).mockResolvedValue({data: true});
        const {getByTestId} = renderWithEverything(
            <MyAutotranslation
                channelId='channel1'
                enabled={false}
                displayName='Test Channel'
                channelAutotranslationEnabled={true}
                isLanguageSupported={true}
            />,
            {database},
        );
        const toggle = getByTestId('channel_info.options.my_autotranslation.option.toggled.false.toggled.false.button');
        await act(async () => {
            fireEvent(toggle, 'valueChange', true);
        });
        await waitFor(() => {
            expect(setMyChannelAutotranslation).toHaveBeenCalledWith(serverUrl, 'channel1', true);
        });
    });

    it('calls alert when toggling from on to off', async () => {
        jest.mocked(setMyChannelAutotranslation).mockResolvedValue({data: false});
        const {getByTestId} = renderWithEverything(
            <MyAutotranslation
                channelId='channel1'
                enabled={true}
                displayName='Test Channel'
                channelAutotranslationEnabled={true}
                isLanguageSupported={true}
            />,
            {database},
        );
        const toggle = getByTestId('channel_info.options.my_autotranslation.option.toggled.true.toggled.true.button');
        await act(async () => {
            fireEvent(toggle, 'valueChange', false);
        });
        await waitFor(() => {
            expect(Alert.alert).toHaveBeenCalledWith('Turn off auto-translation', 'Messages in this channel will revert to their original language. This will only affect how you see this channel. Other members won’t be affected.', [
                {text: 'cancel', style: 'cancel'},
                {text: 'Yes, turn off', onPress: expect.any(Function)},
            ]);
            expect(setMyChannelAutotranslation).not.toHaveBeenCalled();
        });

        const yesButton = jest.mocked(Alert.alert).mock.calls[0][2]?.[1];
        await act(async () => {
            yesButton?.onPress?.();
        });
        await waitFor(() => {
            expect(setMyChannelAutotranslation).toHaveBeenCalledWith(serverUrl, 'channel1', false);
        });
    });
});

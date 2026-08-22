// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused} from '@react-navigation/native';
import React, {type ComponentProps} from 'react';

import {fetchSavedPosts} from '@actions/remote/post';
import Preferences from '@constants/preferences';
import {act, renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import SavedMessages from './saved_messages';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('@react-navigation/native', () => ({
    useIsFocused: jest.fn(() => false),
    useRoute: jest.fn(() => ({params: {direction: 'right'}})),
}));

jest.mock('@actions/remote/post', () => ({
    fetchSavedPosts: jest.fn(() => Promise.resolve()),
}));

jest.mock('@hooks/android_home_tab_back_handler', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('@context/post_config', () => ({
    PostConfigProvider: ({children}: {children: React.ReactNode}) => children,
}));

describe('SavedMessages', () => {
    const serverUrl = 'https://example.com';
    let database: Database;
    let operator: ServerDataOperator;

    function getBaseProps(): ComponentProps<typeof SavedMessages> {
        return {
            currentUser: TestHelper.fakeUserModel(),
            customEmojiNames: [],
            database,
        };
    }

    beforeEach(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
        operator = server.operator;
        jest.clearAllMocks();
        jest.mocked(useIsFocused).mockReturnValue(false);
    });

    afterEach(async () => {
        await TestHelper.tearDown(serverUrl);
    });

    it('should subscribe to saved posts only while the tab is focused', async () => {
        await operator.handlePreferences({
            preferences: [{
                user_id: TestHelper.basicUser!.id,
                category: Preferences.CATEGORIES.SAVED_POST,
                name: TestHelper.basicPost!.id,
                value: 'true',
            }],
            prepareRecordsOnly: false,
        });

        const props = getBaseProps();
        const {queryByTestId, rerender} = renderWithEverything(
            <SavedMessages {...props}/>,
            {database, serverUrl},
        );

        expect(fetchSavedPosts).not.toHaveBeenCalled();
        expect(queryByTestId('saved_messages.post_list')).toBeNull();

        jest.mocked(useIsFocused).mockReturnValue(true);
        await act(async () => {
            rerender(<SavedMessages {...props}/>);
        });

        await waitFor(() => {
            expect(queryByTestId('saved_messages.post_list')).toBeTruthy();
        });
        expect(fetchSavedPosts).toHaveBeenCalledWith(serverUrl);

        jest.mocked(useIsFocused).mockReturnValue(false);
        await act(async () => {
            rerender(<SavedMessages {...props}/>);
        });

        expect(queryByTestId('saved_messages.post_list')).toBeTruthy();
    });
});

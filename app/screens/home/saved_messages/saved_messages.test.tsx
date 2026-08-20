// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused} from '@react-navigation/native';
import React, {type ComponentProps} from 'react';

import {fetchSavedPosts} from '@actions/remote/post';
import * as PreferenceQueries from '@queries/servers/preference';
import {act, renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import SavedMessages from './saved_messages';

import type {Database} from '@nozbe/watermelondb';

const mockUnsubscribe = jest.fn();
const mockSubscribe = jest.fn(() => ({unsubscribe: mockUnsubscribe}));

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

    function getBaseProps(): ComponentProps<typeof SavedMessages> {
        return {
            currentUser: TestHelper.fakeUserModel(),
            customEmojiNames: [],
            database,
        };
    }

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
    });

    afterAll(async () => {
        await TestHelper.tearDown(serverUrl);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockSubscribe.mockReturnValue({unsubscribe: mockUnsubscribe});
        jest.spyOn(PreferenceQueries, 'querySavedPostsPreferences').mockReturnValue({
            observeWithColumns: () => ({
                pipe: () => ({
                    subscribe: mockSubscribe,
                }),
            }),
        } as never);
        jest.mocked(useIsFocused).mockReturnValue(false);
    });

    it('should subscribe to saved posts only while the tab is focused', async () => {
        const props = getBaseProps();
        const {queryByTestId, rerender} = renderWithEverything(
            <SavedMessages {...props}/>,
            {database, serverUrl},
        );

        expect(mockSubscribe).not.toHaveBeenCalled();
        expect(fetchSavedPosts).not.toHaveBeenCalled();
        expect(queryByTestId('saved_messages.post_list')).toBeNull();

        jest.mocked(useIsFocused).mockReturnValue(true);
        await act(async () => {
            rerender(<SavedMessages {...props}/>);
        });

        expect(mockSubscribe).toHaveBeenCalledTimes(1);

        jest.mocked(useIsFocused).mockReturnValue(false);
        await act(async () => {
            rerender(<SavedMessages {...props}/>);
        });

        expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
        expect(queryByTestId('saved_messages.post_list')).toBeNull();
    });
});

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused} from '@react-navigation/native';
import React, {type ComponentProps} from 'react';

import {fetchSavedPosts} from '@actions/remote/post';
import {ActionType, Preferences} from '@constants';
import {querySavedPostsPreferences} from '@queries/servers/preference';
import {act, renderWithEverything} from '@test/intl-test-helper';
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

// Only the provider is stubbed; usePostConfig keeps its real context defaults so the
// rendered posts exercise the same code path as the app.
jest.mock('@context/post_config', () => {
    const actual = jest.requireActual('@context/post_config');
    return {
        ...actual,
        PostConfigProvider: ({children}: {children: React.ReactNode}) => children,
    };
});

describe('SavedMessages', () => {
    const serverUrl = 'https://example.com';
    const savedPostId = 'saved-post-id';
    const savedMessage = 'a saved message';
    let database: Database;
    let operator: ServerDataOperator;

    function getBaseProps(): ComponentProps<typeof SavedMessages> {
        return {
            currentUser: TestHelper.fakeUserModel(),
            customEmojiNames: [],
            database,
        };
    }

    // Seeds the real records the screen's pipeline reads: a post plus the
    // flagged_post preference that marks it saved.
    async function seedSavedPost() {
        const post = TestHelper.fakePost({
            id: savedPostId,
            channel_id: TestHelper.basicChannel!.id,
            user_id: TestHelper.basicUser!.id,
            message: savedMessage,
        });

        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post.id],
            posts: [post],
            prepareRecordsOnly: false,
        });

        await operator.handlePreferences({
            preferences: [{
                category: Preferences.CATEGORIES.SAVED_POST,
                name: post.id,
                user_id: TestHelper.basicUser!.id,
                value: 'true',
            }],
            prepareRecordsOnly: false,
        });
    }

    // Drops the flagged_post preference, i.e. what "unsave" does to the database.
    async function unsaveSeededPost() {
        const preferences = await querySavedPostsPreferences(database, savedPostId).fetch();
        await database.write(async () => {
            await Promise.all(preferences.map((preference) => preference.destroyPermanently()));
        });
    }

    beforeEach(async () => {
        jest.clearAllMocks();
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
        operator = server.operator;
        jest.mocked(useIsFocused).mockReturnValue(false);
    });

    afterEach(async () => {
        await TestHelper.tearDown(serverUrl);
    });

    it('should derive saved posts from the database only while the tab is focused', async () => {
        await seedSavedPost();

        const props = getBaseProps();
        const {queryByText, rerender} = renderWithEverything(
            <SavedMessages {...props}/>,
            {database, serverUrl},
        );

        // Blurred: the screen must not subscribe, so nothing is derived and no
        // saved-posts fetch is issued.
        expect(queryByText(savedMessage)).toBeNull();
        expect(fetchSavedPosts).not.toHaveBeenCalled();

        jest.mocked(useIsFocused).mockReturnValue(true);
        await act(async () => {
            rerender(<SavedMessages {...props}/>);
        });

        // Focused: the seeded post reaches the rendered list through the real
        // querySavedPostsPreferences -> observeSavedPostsByIds -> posts pipeline.
        expect(queryByText(savedMessage)).not.toBeNull();
        expect(fetchSavedPosts).toHaveBeenCalledWith(serverUrl);

        jest.mocked(useIsFocused).mockReturnValue(false);
        await act(async () => {
            rerender(<SavedMessages {...props}/>);
        });

        // Blurred again: the subscription is torn down, so unsaving the post in the
        // database no longer reaches the screen. The already-rendered list stays put
        // (this is a bottom tab that remains mounted while blurred).
        await act(async () => {
            await unsaveSeededPost();
        });
        expect(queryByText(savedMessage)).not.toBeNull();

        // Refocusing re-subscribes, and the fresh subscription reads current database
        // state — which is what makes a save/unsave that happened while blurred show up.
        jest.mocked(useIsFocused).mockReturnValue(true);
        await act(async () => {
            rerender(<SavedMessages {...props}/>);
        });

        expect(queryByText(savedMessage)).toBeNull();
    });

    it('should render no posts when nothing is saved', async () => {
        jest.mocked(useIsFocused).mockReturnValue(true);

        const props = getBaseProps();
        const {queryByText} = renderWithEverything(<SavedMessages {...props}/>, {database, serverUrl});

        await act(async () => {
            await Promise.resolve();
        });

        expect(queryByText(savedMessage)).toBeNull();
        expect(fetchSavedPosts).toHaveBeenCalledWith(serverUrl);
    });
});

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused} from '@react-navigation/native';
import React from 'react';

import {fetchSavedPosts} from '@actions/remote/post';
import {ActionType, Preferences} from '@constants';
import {querySavedPostsPreferences} from '@queries/servers/preference';
import {act, renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import SavedMessages from './index';

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

// Rendered through ./index rather than ./saved_messages so the withObservables
// pipeline (preferences -> saved post ids -> posts) is what feeds the list. That
// pipeline is the part this screen gets wrong when it churns, so it is the part
// worth covering.
describe('SavedMessages', () => {
    const serverUrl = 'https://example.com';
    const savedPostId = 'saved-post-id';
    const savedMessage = 'a saved message';
    const otherPostId = 'other-post-id';
    const otherMessage = 'another saved message';
    let database: Database;
    let operator: ServerDataOperator;

    async function seedPost(id: string, message: string) {
        const post = TestHelper.fakePost({
            id,
            channel_id: TestHelper.basicChannel!.id,
            user_id: TestHelper.basicUser!.id,
            message,
        });

        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post.id],
            posts: [post],
            prepareRecordsOnly: false,
        });
    }

    // Writes the flagged_post preference that marks a post saved.
    async function savePost(id: string) {
        await operator.handlePreferences({
            preferences: [{
                category: Preferences.CATEGORIES.SAVED_POST,
                name: id,
                user_id: TestHelper.basicUser!.id,
                value: 'true',
            }],
            prepareRecordsOnly: false,
        });
    }

    // Drops the flagged_post preference, i.e. what "unsave" does to the database.
    async function unsavePost(id: string) {
        const preferences = await querySavedPostsPreferences(database, id).fetch();
        await database.write(async () => {
            await Promise.all(preferences.map((preference) => preference.destroyPermanently()));
        });
    }

    beforeEach(async () => {
        jest.clearAllMocks();
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
        operator = server.operator;
        jest.mocked(useIsFocused).mockReturnValue(true);
    });

    afterEach(async () => {
        await TestHelper.tearDown(serverUrl);
    });

    it('should render a saved post from the database', async () => {
        await seedPost(savedPostId, savedMessage);
        await savePost(savedPostId);

        const {queryByText} = renderWithEverything(<SavedMessages/>, {database, serverUrl});

        await act(async () => {
            await Promise.resolve();
        });

        expect(queryByText(savedMessage)).not.toBeNull();
        expect(fetchSavedPosts).toHaveBeenCalledWith(serverUrl);
    });

    it('should add a newly saved post to the list', async () => {
        await seedPost(savedPostId, savedMessage);
        await savePost(savedPostId);
        await seedPost(otherPostId, otherMessage);

        const {queryByText} = renderWithEverything(<SavedMessages/>, {database, serverUrl});

        await act(async () => {
            await Promise.resolve();
        });
        expect(queryByText(otherMessage)).toBeNull();

        // The id set genuinely changes here, so the distinctUntilChanged guards in
        // index.ts must not swallow it.
        await act(async () => {
            await savePost(otherPostId);
        });

        expect(queryByText(savedMessage)).not.toBeNull();
        expect(queryByText(otherMessage)).not.toBeNull();
    });

    it('should remove a post from the list when it is unsaved', async () => {
        await seedPost(savedPostId, savedMessage);
        await savePost(savedPostId);

        const {queryByText} = renderWithEverything(<SavedMessages/>, {database, serverUrl});

        await act(async () => {
            await Promise.resolve();
        });
        expect(queryByText(savedMessage)).not.toBeNull();

        await act(async () => {
            await unsavePost(savedPostId);
        });

        expect(queryByText(savedMessage)).toBeNull();
    });

    it('should render no posts when nothing is saved', async () => {
        const {queryByText} = renderWithEverything(<SavedMessages/>, {database, serverUrl});

        await act(async () => {
            await Promise.resolve();
        });

        expect(queryByText(savedMessage)).toBeNull();
        expect(fetchSavedPosts).toHaveBeenCalledWith(serverUrl);
    });

    it('should not fetch saved posts while the tab is blurred', async () => {
        jest.mocked(useIsFocused).mockReturnValue(false);

        renderWithEverything(<SavedMessages/>, {database, serverUrl});

        await act(async () => {
            await Promise.resolve();
        });

        expect(fetchSavedPosts).not.toHaveBeenCalled();
    });
});

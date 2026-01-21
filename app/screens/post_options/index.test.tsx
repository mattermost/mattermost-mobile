// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen, waitFor} from '@testing-library/react-native';

import {ActionType, Screens} from '@constants';
import {PostTypes} from '@constants/post';
import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import PostOptions from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type PostModel from '@typings/database/models/servers/post';

const serverUrl = 'https://www.community.mattermost.com';

jest.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock');
    return {
        ...Reanimated,
        useReducedMotion: jest.fn(() => 'never'),
    };
});

describe('PostOptions', () => {
    let database: Database;
    let operator: ServerDataOperator;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
        operator = server.operator;
    });

    afterAll(() => {
        DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should show limited options for unrevealed BoR post', async () => {
        const post = TestHelper.fakePost({
            id: 'post1',
            type: PostTypes.BURN_ON_READ,
            channel_id: TestHelper.basicChannel!.id,
            user_id: TestHelper.basicUser!.id,
            message: 'This is a regular post',
            metadata: {

                // missing expire_at key indicates unrevealed BoR post
            },
        });
        const models = await operator.handlePosts({posts: [post], order: [post.id], actionType: ActionType.POSTS.RECEIVED_NEW, prepareRecordsOnly: false});
        const unrevealedBoRPost = models[0] as PostModel;

        renderWithEverything(
            <PostOptions
                postId={unrevealedBoRPost.id}
                serverUrl={serverUrl}
                showAddReaction={true}
                sourceScreen={Screens.DRAFT_SCHEDULED_POST_OPTIONS}
            />,
            {database},
        );

        await waitFor(() => {
            expect(screen.queryByText('Copy Link')).toBeVisible();
            expect(screen.queryByText('Save')).toBeVisible();

            expect(screen.queryByText('Pin to Channel')).not.toBeVisible();
            expect(screen.queryByText('Copy Text')).not.toBeVisible();
            expect(screen.queryByText('Edit')).not.toBeVisible();
            expect(screen.queryByText('Reply')).not.toBeVisible();
            expect(screen.queryByText('Follow Message')).not.toBeVisible();
        });
    });

    it('should show limited options for revealed BoR post', async () => {
        const post = TestHelper.fakePost({
            id: 'post1',
            type: PostTypes.BURN_ON_READ,
            channel_id: TestHelper.basicChannel!.id,
            user_id: TestHelper.basicUser!.id,
            message: 'This is a revealed BoR post',
            metadata: {
                expire_at: Date.now() + 1000000,
            },
            props: {
                expire_at: Date.now() + 1000000000,
            },
        });
        const models = await operator.handlePosts({posts: [post], order: [post.id], actionType: ActionType.POSTS.RECEIVED_NEW, prepareRecordsOnly: false});
        const unrevealedBoRPost = models[0] as PostModel;

        renderWithEverything(
            <PostOptions
                postId={unrevealedBoRPost.id}
                serverUrl={serverUrl}
                showAddReaction={true}
                sourceScreen={Screens.DRAFT_SCHEDULED_POST_OPTIONS}
            />,
            {database},
        );

        await waitFor(() => {
            expect(screen.queryByText('Copy Link')).toBeVisible();
            expect(screen.queryByText('Save')).toBeVisible();

            expect(screen.queryByText('Copy Text')).not.toBeVisible();
            expect(screen.queryByText('Pin to Channel')).not.toBeVisible();
            expect(screen.queryByText('Edit')).not.toBeVisible();
            expect(screen.queryByText('Reply')).not.toBeVisible();
            expect(screen.queryByText('Follow Message')).not.toBeVisible();
        });
    });

    it('should show all options for regular post', async () => {
        const post = TestHelper.fakePost({
            id: 'post1',
            channel_id: TestHelper.basicChannel!.id,
            user_id: TestHelper.basicUser!.id,
            message: 'This is a regular post',
        });
        const models = await operator.handlePosts({posts: [post], order: [post.id], actionType: ActionType.POSTS.RECEIVED_NEW, prepareRecordsOnly: false});
        const notBoRPost = models[0] as PostModel;

        renderWithEverything(
            <PostOptions
                postId={notBoRPost.id}
                serverUrl={serverUrl}
                showAddReaction={true}
                sourceScreen={Screens.DRAFT_SCHEDULED_POST_OPTIONS}
            />,
            {database},
        );

        await waitFor(() => {
            expect(screen.queryByText('Copy Link')).toBeVisible();
            expect(screen.queryByText('Save')).toBeVisible();
            expect(screen.queryByText('Pin to Channel')).toBeVisible();
            expect(screen.queryByText('Copy Text')).toBeVisible();
            expect(screen.queryByText('Reply')).toBeVisible();
            expect(screen.queryByText('Edit')).toBeVisible();

            // cannot mark own post as unread in the mobile app.
            expect(screen.queryByText('Mark as Unread')).not.toBeVisible();
            expect(screen.queryByText('Follow Message')).not.toBeVisible();
        });
    });
});

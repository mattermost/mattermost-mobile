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

jest.mock('@gorhom/bottom-sheet', () => {
    const {ScrollView} = require('react-native');
    return {
        BottomSheetScrollView: ScrollView,
        useBottomSheetInternal: jest.fn().mockReturnValue({
            animatedIndex: {value: 1},
            animatedPosition: {value: 0},
            shouldHandleKeyboardEvents: {value: false},
        }),
    };
});

jest.mock('@screens/bottom_sheet', () => {
    const MockReact = require('react');
    const {View} = require('react-native');
    return ({renderContent, children, testID}: {renderContent?: () => React.ReactNode; children?: React.ReactNode; testID?: string}) =>
        MockReact.createElement(View, {testID: testID || 'bottom-sheet'}, renderContent ? renderContent() : children);
});

describe('PostOptions', () => {
    let database: Database;
    let operator: ServerDataOperator;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
        operator = server.operator;

        jest.spyOn(console, 'warn').mockImplementation((msg: string) => {
            if (!msg?.includes('scrollable node handle')) {
                process.stdout.write(`${msg}\n`);
            }
        });
    });

    afterAll(() => {
        DatabaseManager.destroyServerDatabase(serverUrl);
        jest.restoreAllMocks();
    });

    it('should show limited options for own BoR post', async () => {
        const post = TestHelper.fakePost({
            type: PostTypes.BURN_ON_READ,
            channel_id: TestHelper.basicChannel!.id,
            user_id: TestHelper.basicUser!.id,
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
            expect(screen.queryByText('Save')).toBeVisible();
        });

        expect(screen.queryByText('Copy Link')).toBeVisible();

        expect(screen.queryByText('Pin to Channel')).not.toBeVisible();
        expect(screen.queryByText('Copy Text')).not.toBeVisible();
        expect(screen.queryByText('Edit')).not.toBeVisible();
        expect(screen.queryByText('Reply')).not.toBeVisible();
        expect(screen.queryByText('Follow Message')).not.toBeVisible();
    });

    it('should show limited options for received unrevealed BoR post', async () => {
        const post = TestHelper.fakePost({
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

    it('should show limited options for someone else\'s revealed BoR post', async () => {
        const post = TestHelper.fakePost({
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
            expect(screen.getByText('Copy Link')).toBeVisible();
            expect(screen.queryByText('Save')).toBeVisible();

            expect(screen.queryByText('Mark as Unread')).not.toBeVisible();
            expect(screen.queryByText('Copy Text')).not.toBeVisible();
            expect(screen.queryByText('Pin to Channel')).not.toBeVisible();
            expect(screen.queryByText('Edit')).not.toBeVisible();
            expect(screen.queryByText('Reply')).not.toBeVisible();
            expect(screen.queryByText('Follow Message')).not.toBeVisible();
        });
    });

    it('should show all options for regular post', async () => {
        const post = TestHelper.fakePost({
            channel_id: TestHelper.basicChannel!.id,
            user_id: TestHelper.basicUser!.id,
            message: 'This is a regular post',
        });

        const models = await operator.handlePosts({posts: [post], order: [post.id], actionType: ActionType.POSTS.RECEIVED_NEW, prepareRecordsOnly: false});
        const postModel = models[0] as PostModel;

        renderWithEverything(
            <PostOptions
                postId={postModel.id}
                serverUrl={serverUrl}
                showAddReaction={true}
                sourceScreen={Screens.DRAFT_SCHEDULED_POST_OPTIONS}
            />,
            {database},
        );

        await waitFor(() => {
            expect(screen.queryByText('Copy Link')).toBeVisible();
            expect(screen.queryByText('Save')).toBeVisible();

            expect(screen.queryByText('Copy Text')).toBeVisible();
            expect(screen.queryByText('Pin to Channel')).toBeVisible();
            expect(screen.queryByText('Edit')).toBeVisible();
            expect(screen.queryByText('Reply')).toBeVisible();
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

    it('should show BOR read receipts for own BoR post', async () => {
        const post = TestHelper.fakePost({
            type: PostTypes.BURN_ON_READ,
            channel_id: TestHelper.basicChannel!.id,
            user_id: TestHelper.basicUser!.id,
            message: 'This is my BoR post',
            metadata: {
                expire_at: Date.now() + 1000000,
                recipients: ['user1', 'user2'],
            },
        });

        const models = await operator.handlePosts({posts: [post], order: [post.id], actionType: ActionType.POSTS.RECEIVED_NEW, prepareRecordsOnly: false});
        const ownBoRPost = models[0] as PostModel;

        renderWithEverything(
            <PostOptions
                postId={ownBoRPost.id}
                serverUrl={serverUrl}
                showAddReaction={true}
                sourceScreen={Screens.DRAFT_SCHEDULED_POST_OPTIONS}
            />,
            {database},
        );

        await waitFor(() => {
            expect(screen.queryByTestId('bor_read_receipts')).toBeVisible();
        });

        expect(screen.getByText('Read by 2 of 99 recipients')).toBeVisible();
    });

    it('should not show BOR read receipts for other users BoR post', async () => {
        const post = TestHelper.fakePost({
            type: PostTypes.BURN_ON_READ,
            channel_id: TestHelper.basicChannel!.id,
            user_id: TestHelper.generateId(), // Different user
            message: 'This is someone else\'s BoR post',
            metadata: {
                expire_at: Date.now() + 1000000,
                recipients: ['user1', 'user2'],
            },
        });

        const models = await operator.handlePosts({posts: [post], order: [post.id], actionType: ActionType.POSTS.RECEIVED_NEW, prepareRecordsOnly: false});
        const otherUserBoRPost = models[0] as PostModel;

        renderWithEverything(
            <PostOptions
                postId={otherUserBoRPost.id}
                serverUrl={serverUrl}
                showAddReaction={true}
                sourceScreen={Screens.DRAFT_SCHEDULED_POST_OPTIONS}
            />,
            {database},
        );

        await waitFor(() => {
            expect(screen.queryByTestId('bor_read_receipts')).not.toBeVisible();
        });
    });
});

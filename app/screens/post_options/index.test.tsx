// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen, waitFor} from '@testing-library/react-native';

import {PostTypes} from '@constants/post';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import PostOptions from './index';

import type {Database} from '@nozbe/watermelondb';

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
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('should show limited options for unrevealed BoR post', async () => {
        const unrevealedBoRPost = TestHelper.fakePostModel({
            type: PostTypes.BURN_ON_READ,
            channelId: TestHelper.basicChannel!.id,
            userId: TestHelper.generateId(),
            metadata: {

                // missing expire_at key indicates unrevealed BoR post
            },
        });

        renderWithEverything(
            <PostOptions
                post={unrevealedBoRPost}
                serverUrl={serverUrl}
                showAddReaction={true}
                sourceScreen={'DraftScheduledPostOptions'}
                componentId={'DraftScheduledPostOptions'}
            />,
            {database},
        );

        await waitFor(() => {
            expect(screen.getByText('Mark as Unread')).toBeVisible();
        });

        expect(screen.queryByText('Copy Link')).toBeVisible();
        expect(screen.queryByText('Save')).toBeVisible();
        expect(screen.queryByText('Pin to Channel')).toBeVisible();

        expect(screen.queryByText('Copy Text')).not.toBeVisible();
        expect(screen.queryByText('Edit')).not.toBeVisible();
        expect(screen.queryByText('Reply')).not.toBeVisible();
        expect(screen.queryByText('Follow Message')).not.toBeVisible();
    });

    it('should show limited options for revealed BoR post', async () => {
        const unrevealedBoRPost = TestHelper.fakePostModel({
            type: PostTypes.BURN_ON_READ,
            channelId: TestHelper.basicChannel!.id,
            userId: TestHelper.generateId(),
            message: 'This is a revealed BoR post',
            metadata: {
                expire_at: Date.now() + 1000000,
            },
            props: {
                expire_at: Date.now() + 1000000000,
            },
        });

        renderWithEverything(
            <PostOptions
                post={unrevealedBoRPost}
                serverUrl={serverUrl}
                showAddReaction={true}
                sourceScreen={'DraftScheduledPostOptions'}
                componentId={'DraftScheduledPostOptions'}
            />,
            {database},
        );

        await waitFor(() => {
            expect(screen.getByText('Mark as Unread')).toBeVisible();
        });

        expect(screen.queryByText('Copy Link')).toBeVisible();
        expect(screen.queryByText('Save')).toBeVisible();
        expect(screen.queryByText('Pin to Channel')).toBeVisible();
        expect(screen.queryByText('Copy Text')).toBeVisible();

        expect(screen.queryByText('Edit')).not.toBeVisible();
        expect(screen.queryByText('Reply')).not.toBeVisible();
        expect(screen.queryByText('Follow Message')).not.toBeVisible();
    });

    it('should show all options for regular post', async () => {
        const unrevealedBoRPost = TestHelper.fakePostModel({
            channelId: TestHelper.basicChannel!.id,
            userId: TestHelper.basicUser!.id,
            message: 'This is a regular post',
        });

        renderWithEverything(
            <PostOptions
                post={unrevealedBoRPost}
                serverUrl={serverUrl}
                showAddReaction={true}
                sourceScreen={'DraftScheduledPostOptions'}
                componentId={'DraftScheduledPostOptions'}
            />,
            {database},
        );

        await waitFor(() => {
            expect(screen.queryByText('Copy Link')).toBeVisible();
        });

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

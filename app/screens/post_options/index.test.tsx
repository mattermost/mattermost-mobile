// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';

import {PostTypes} from '@constants/post';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import PostOptions from './index';

import type {Database} from '@nozbe/watermelondb';

const serverUrl = 'https://www.community.mattermost.com';

describe('PostOptions', () => {
    let database: Database;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('should show limited options for unrevealed BoR post', () => {
        const unrevealedBoRPost = TestHelper.fakePost({
            type: PostTypes.BURN_ON_READ,
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

        expect(screen.getByText('Mark as Unread')).toBeVisible();
    });
});

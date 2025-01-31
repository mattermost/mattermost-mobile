    
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {act} from 'react-test-renderer';

import {renderWithEverything, waitFor, screen} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Thread from './thread';

import type Database from '@nozbe/watermelondb/Database';
import type PostModel from '@typings/database/models/servers/post';

describe('components/thread', () => {
    let database: Database;
    let rootPost: PostModel;
    
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
        
        // Create a test post
        const channelId = 'channel-id';
        rootPost = await database.get('posts').create((p) => {
            p.id = 'post-id';
            p.channelId = channelId;
            p.message = 'test message';
            p.userId = 'user-id';
        });
    });

    afterAll(async () => {
        await TestHelper.tearDown();
    });

    it('renders without error', () => {
        const wrapper = renderWithEverything(
            <Thread
                componentId='component-id'
                isCRTEnabled={true}
                showJoinCallBanner={false}
                isInACall={false}
                showIncomingCalls={false}
                rootId={rootPost.id}
                rootPost={rootPost}
            />,
            {database},
        );

        expect(wrapper.toJSON()).toBeTruthy();
    });

    it('shows loading state when root post is undefined', async () => {
        renderWithEverything(
            <Thread
                componentId='component-id'
                isCRTEnabled={true}
                showJoinCallBanner={false}
                isInACall={false}
                showIncomingCalls={false}
                rootId='invalid-post-id'
                rootPost={undefined}
            />,
            {database},
        );

        await waitFor(() => {
            expect(screen.queryByTestId('thread.screen')).toBeTruthy();
        });
    });

    it('shows floating call container when call features are enabled', () => {
        renderWithEverything(
            <Thread
                componentId='component-id'
                isCRTEnabled={true}
                showJoinCallBanner={true}
                isInACall={true}
                showIncomingCalls={true}
                rootId={rootPost.id}
                rootPost={rootPost}
            />,
            {database},
        );

        expect(screen.getByTestId('floating_call_container')).toBeTruthy();
    });
});

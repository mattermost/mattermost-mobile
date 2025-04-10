// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import NetworkManager from '@managers/network_manager';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import {getPostById} from '@queries/servers/post';
import {renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Post from './post';

import type {Database} from '@nozbe/watermelondb';
import type PostModel from '@typings/database/models/servers/post';

jest.mock('@managers/performance_metrics_manager');

describe('performance metrics', () => {
    let database: Database;
    let post: PostModel;

    function getBaseProps(): ComponentProps<typeof Post> {
        return {
            appsEnabled: false,
            canDelete: false,
            customEmojiNames: [],
            differentThreadSequence: false,
            hasFiles: false,
            hasReactions: false,
            hasReplies: false,
            highlightReplyBar: false,
            isEphemeral: false,
            isPostAddChannelMember: false,
            isPostPriorityEnabled: false,
            location: 'Channel',
            post,
            isLastPost: true,
        };
    }

    const serverUrl = 'http://www.someserverurl.com';
    beforeEach(async () => {
        const client = await NetworkManager.createClient(serverUrl);
        expect(client).toBeTruthy();
        database = (await TestHelper.setupServerDatabase(serverUrl)).database;
        post = (await getPostById(database, TestHelper.basicPost!.id))!;
    });

    afterEach(async () => {
        await TestHelper.tearDown();
        NetworkManager.invalidateClient(serverUrl);
    });

    it('do not call the performance metrics if it is not the last post', async () => {
        const props = getBaseProps();
        props.isLastPost = false;
        renderWithEverything(<Post {...props}/>, {database, serverUrl});
        await waitFor(() => {
            expect(PerformanceMetricsManager.finishLoad).not.toHaveBeenCalled();
            expect(PerformanceMetricsManager.endMetric).not.toHaveBeenCalled();
        });
    });
    it('on channel', async () => {
        const props = getBaseProps();
        renderWithEverything(<Post {...props}/>, {database, serverUrl});
        await waitFor(() => {
            expect(PerformanceMetricsManager.finishLoad).toHaveBeenCalledWith('CHANNEL', serverUrl);
            expect(PerformanceMetricsManager.endMetric).toHaveBeenCalledWith('mobile_channel_switch', serverUrl);
        });
    });
    it('on thread', async () => {
        const props = getBaseProps();
        props.location = 'Thread';
        renderWithEverything(<Post {...props}/>, {database, serverUrl});
        await waitFor(() => {
            expect(PerformanceMetricsManager.finishLoad).toHaveBeenCalledWith('THREAD', serverUrl);
            expect(PerformanceMetricsManager.endMetric).toHaveBeenCalledWith('mobile_channel_switch', serverUrl);
        });
    });
});

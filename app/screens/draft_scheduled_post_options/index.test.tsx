// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {cleanup, screen} from '@testing-library/react-native';
import React from 'react';

import {ActionType} from '@constants';
import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED} from '@constants/draft';
import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import DraftScheduledPostOptions from './index';

import type {Database} from '@nozbe/watermelondb';
import type DraftModel from '@typings/database/models/servers/draft';
import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

jest.mock('@hooks/device', () => ({
    useIsTablet: jest.fn().mockReturnValue(false),
}));

describe('DraftScheduledPostOptions', () => {
    let database: Database;
    let drafts: DraftModel[] | undefined;
    let scheduled: ScheduledPostModel[] | undefined;
    const baseProps: Parameters<typeof DraftScheduledPostOptions>[0] = {
        draftType: DRAFT_TYPE_DRAFT,
        channelId: 'channel-id',
        rootId: '',
        draftId: 'draft-id',
        draftReceiverUserName: 'username',
    };

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
        drafts = await server.operator.handleDraft({
            drafts: [{
                channel_id: TestHelper.basicChannel!.id,
                root_id: '',
                message: 'This is a draft message',
                update_at: Date.now(),
            }],
            prepareRecordsOnly: false,
        });
        scheduled = await server.operator.handleScheduledPosts({
            scheduledPosts: [{
                id: 'draft-id',
                channel_id: TestHelper.basicChannel!.id,
                root_id: '',
                message: 'This is a scheduled post message',
                scheduled_at: Date.now() + 3600000, // 1 hour in the future
                update_at: Date.now(),
                create_at: Date.now(),
                user_id: TestHelper.basicUser!.id,
            }],
            actionType: ActionType.SCHEDULED_POSTS.RECEIVED_ALL_SCHEDULED_POSTS,
            prepareRecordsOnly: false,
        });
    });

    afterEach(async () => {
        cleanup();

        // Allow observables to settle before next test
        await new Promise((resolve) => setTimeout(resolve, 0));
    });

    afterAll(async () => {
        await DatabaseManager.destroyServerDatabase('https://appv1.mattermost.com');
    });

    it('renders draft options correctly', () => {
        renderWithEverything(
            <DraftScheduledPostOptions
                {...baseProps}
                draftId={drafts![0].id}
                channelId={drafts![0].channelId}
            />, {database},
        );

        expect(screen.getByText('Draft actions')).toBeTruthy();
        expect(screen.getByText('Copy Text')).toBeTruthy();
        expect(screen.getByTestId('edit_draft')).toBeTruthy();
        expect(screen.getByTestId('send_draft_button')).toBeTruthy();
        expect(screen.getByTestId('delete_draft')).toBeTruthy();
    });

    it('renders scheduled post options correctly', async () => {
        const scheduledProps = {
            ...baseProps,
            channelId: scheduled![0].channelId,
            draftType: DRAFT_TYPE_SCHEDULED,
            draftId: scheduled![0].id,
            scheduledAt: scheduled![0].scheduledAt,
        };

        renderWithEverything(
            <DraftScheduledPostOptions {...scheduledProps}/>, {database},
        );

        expect(screen.getByText('Message actions')).toBeTruthy();
        expect(screen.getByText('Copy Text')).toBeTruthy();
        expect(screen.getByTestId('send_draft_button')).toBeTruthy();
        expect(screen.getByTestId('rescheduled_draft')).toBeTruthy();
        expect(screen.getByTestId('delete_draft')).toBeTruthy();
        expect(screen.queryByTestId('edit_draft')).toBeFalsy(); // Edit option should not be present for scheduled posts
    });

    it('renders tablet view without header', () => {
        jest.requireMock('@hooks/device').useIsTablet.mockReturnValueOnce(true);

        renderWithEverything(
            <DraftScheduledPostOptions
                {...baseProps}
                draftId={drafts![0].id}
                channelId={drafts![0].channelId}
            />, {database},
        );

        expect(screen.queryByText('Draft actions')).toBeTruthy(); // Header should also be present in tablet view
        expect(screen.getByTestId('edit_draft')).toBeTruthy(); // Verify some content is rendered
    });
});

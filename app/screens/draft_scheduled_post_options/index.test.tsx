// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React from 'react';

import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED} from '@constants/draft';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import DraftScheduledPostOptions from './index';

import type {Database} from '@nozbe/watermelondb';
import type ChannelModel from '@typings/database/models/servers/channel';
import type DraftModel from '@typings/database/models/servers/draft';
import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

jest.mock('@hooks/device', () => ({
    useIsTablet: jest.fn().mockReturnValue(false),
}));

describe('DraftScheduledPostOptions', () => {
    let database: Database;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    const baseProps: Parameters<typeof DraftScheduledPostOptions>[0] = {
        draftType: DRAFT_TYPE_DRAFT,
        channel: {
            id: 'channel-id',
            name: 'channel-name',
        } as ChannelModel,
        rootId: '',
        draft: {
            id: 'draft-id',
            message: 'draft message',
            files: [],
        } as unknown as DraftModel,
        draftReceiverUserName: 'username',
    };

    it('renders draft options correctly', () => {
        renderWithEverything(
            <DraftScheduledPostOptions {...baseProps}/>, {database},
        );

        expect(screen.getByText('Draft actions')).toBeTruthy();
        expect(screen.getByText('Copy Text')).toBeTruthy();
        expect(screen.getByTestId('edit_draft')).toBeTruthy();
        expect(screen.getByTestId('send_draft_button')).toBeTruthy();
        expect(screen.getByTestId('delete_draft')).toBeTruthy();
    });

    it('renders scheduled post options correctly', () => {
        const scheduledProps = {
            ...baseProps,
            draftType: DRAFT_TYPE_SCHEDULED,
            draft: {
                ...baseProps.draft,
                scheduledAt: Date.now() + 3600000, // 1 hour in the future
            } as ScheduledPostModel,
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
            <DraftScheduledPostOptions {...baseProps}/>, {database},
        );

        expect(screen.queryByText('Draft actions')).toBeFalsy(); // Header should not be present in tablet view
        expect(screen.getByTestId('edit_draft')).toBeTruthy(); // Verify some content is rendered
    });
});

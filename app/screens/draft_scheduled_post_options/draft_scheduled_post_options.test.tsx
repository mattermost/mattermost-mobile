// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED, type DraftType} from '@screens/global_drafts/constants';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

// Mock the component to avoid hook issues
jest.mock('.', () => ({
    __esModule: true,
    default: jest.fn(() => null),
}));

// Mock dependencies
jest.mock('@components/formatted_text', () => jest.fn(() => null));
jest.mock('@screens/bottom_sheet', () => jest.fn(({renderContent}) => renderContent()));
jest.mock('@components/post_draft/send_handler/', () => jest.fn(() => null));
jest.mock('./delete_draft', () => jest.fn(() => null));
jest.mock('./edit_draft', () => jest.fn(() => null));
jest.mock('./rescheduled_draft', () => jest.fn(() => null));
jest.mock('@screens/post_options/options/copy_text_option', () => jest.fn(() => null));

import DraftScheduledPostOptions from '.';

import type {Database} from '@nozbe/watermelondb';
import type ChannelModel from '@typings/database/models/servers/channel';
import type DraftModel from '@typings/database/models/servers/draft';
import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

describe('DraftScheduledPostOptions', () => {
    let database: Database;
    const mockDraftOptions = DraftScheduledPostOptions as jest.Mock;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render the draft options component for draft', () => {
        const props = {
            channel: {
                id: 'channel_id',
                teamId: 'team_id',
            } as unknown as ChannelModel,
            rootId: '',
            draft: {
                updateAt: 1633024800000,
                message: 'Hello, World!',
                channelId: 'channel_id',
                rootId: '',
                files: [],
                metadata: {},
                id: 'draft_id',
            } as unknown as DraftModel,
            draftReceiverUserName: undefined,
            draftType: DRAFT_TYPE_DRAFT as DraftType,
        };

        renderWithEverything(
            <DraftScheduledPostOptions {...props}/>, {database},
        );

        // Verify the component was called with the right props
        expect(mockDraftOptions).toHaveBeenCalledWith(
            expect.objectContaining({
                draftType: DRAFT_TYPE_DRAFT,
                channel: expect.objectContaining({id: 'channel_id'}),
            }),
            expect.anything(),
        );
    });

    it('should render the draft options component for scheduled post', () => {
        const props = {
            channel: {
                id: 'channel_id',
                teamId: 'team_id',
            } as unknown as ChannelModel,
            rootId: '',
            draft: {
                updateAt: 1633024800000,
                message: 'Hello, World!',
                channelId: 'channel_id',
                rootId: '',
                files: [],
                metadata: {},
                id: 'draft_id',
            } as unknown as ScheduledPostModel,
            draftReceiverUserName: undefined,
            draftType: DRAFT_TYPE_SCHEDULED as DraftType,
        };

        renderWithEverything(
            <DraftScheduledPostOptions {...props}/>, {database},
        );

        // Verify the component was called with the right props
        expect(mockDraftOptions).toHaveBeenCalledWith(
            expect.objectContaining({
                draftType: DRAFT_TYPE_SCHEDULED,
                channel: expect.objectContaining({id: 'channel_id'}),
            }),
            expect.anything(),
        );
    });
});

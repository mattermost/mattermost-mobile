// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED, type DraftType} from '@screens/global_drafts/constants';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import DraftScheduledPostOptions from '.';

import type {Database} from '@nozbe/watermelondb';
import type ChannelModel from '@typings/database/models/servers/channel';
import type DraftModel from '@typings/database/models/servers/draft';

describe('DraftScheduledPostOptions', () => {
    let database: Database;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
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
            } as unknown as DraftModel,
            draftReceiverUserName: undefined,
            draftType: DRAFT_TYPE_DRAFT as DraftType,
        };
        const wrapper = renderWithEverything(
            <DraftScheduledPostOptions {...props}/>, {database},
        );
        const {getByText} = wrapper;
        expect(getByText('Draft actions')).toBeTruthy();
        expect(getByText('Copy Text')).toBeTruthy();
        expect(getByText('Edit draft')).toBeTruthy();
        expect(getByText('Send draft')).toBeTruthy();
        expect(getByText('Delete draft')).toBeTruthy();
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
            } as unknown as DraftModel,
            draftReceiverUserName: undefined,
            draftType: DRAFT_TYPE_SCHEDULED as DraftType,
        };
        const wrapper = renderWithEverything(
            <DraftScheduledPostOptions {...props}/>, {database},
        );
        const {getByText} = wrapper;
        expect(getByText('Message actions')).toBeTruthy();
        expect(getByText('Copy Text')).toBeTruthy();
        expect(getByText('Send')).toBeTruthy();
        expect(getByText('Reschedule')).toBeTruthy();
        expect(getByText('Delete')).toBeTruthy();
    });
});

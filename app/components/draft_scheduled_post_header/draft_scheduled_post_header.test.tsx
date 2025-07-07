// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React from 'react';

import {General} from '@constants';
import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED} from '@constants/draft';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import DraftAndScheduledPostHeader from './draft_scheduled_post_header';

// Mock the datetime util to provide both getReadableTimestamp and toMilliseconds
jest.mock('@utils/datetime', () => ({
    getReadableTimestamp: jest.fn(() => 'May 5, 2025, 10:00 AM'),
    toMilliseconds: jest.fn(({minutes}) => minutes * 60 * 1000),
}));

jest.mock('@utils/user', () => ({
    getUserTimezone: jest.fn(() => ({
        useAutomaticTimezone: true,
        automaticTimezone: 'America/New_York',
        manualTimezone: '',
    })),
}));

jest.mock('@utils/scheduled_post', () => ({
    getErrorStringFromCode: jest.fn(() => 'Error message'),
}));

jest.mock('@components/draft_scheduled_post_header/profile_avatar', () => {
    const MockProfileAvatar = () => null;
    return MockProfileAvatar;
});

describe('DraftAndScheduledPostHeader', () => {
    const baseProps: Parameters<typeof DraftAndScheduledPostHeader>[0] = {
        channel: TestHelper.fakeChannelModel({
            id: 'channel-id',
            type: General.OPEN_CHANNEL,
            displayName: 'Test Channel',
        }),
        updateAt: 1620000000000,
        draftType: DRAFT_TYPE_DRAFT,
        testID: 'draft_header',
        isMilitaryTime: false,
        currentUser: TestHelper.fakeUserModel({
            id: 'user-id',
            username: 'testuser',
            locale: 'en',
        }),
    };

    it('renders draft header correctly', () => {
        renderWithIntlAndTheme(<DraftAndScheduledPostHeader {...baseProps}/>);

        expect(screen.getByText('In:')).toBeTruthy();
        expect(screen.getByText('Test Channel')).toBeTruthy();
    });

    it('renders DM draft header correctly', () => {
        const dmProps: Parameters<typeof DraftAndScheduledPostHeader>[0] = {
            ...baseProps,
            channel: TestHelper.fakeChannelModel({
                id: 'channel-id',
                type: General.DM_CHANNEL,
                displayName: 'Test Channel',
            }),
            postReceiverUser: TestHelper.fakeUserModel({
                id: 'receiver-id',
                username: 'receiver',
            }),
        };

        renderWithIntlAndTheme(<DraftAndScheduledPostHeader {...dmProps}/>);

        expect(screen.getByText('To:')).toBeTruthy();
    });

    it('renders thread draft header correctly', () => {
        const threadProps = {
            ...baseProps,
            rootId: 'root-post-id',
        };

        renderWithIntlAndTheme(<DraftAndScheduledPostHeader {...threadProps}/>);

        expect(screen.getByText('Thread in:')).toBeTruthy();
    });

    it('renders scheduled post header correctly', () => {
        const scheduledProps = {
            ...baseProps,
            draftType: DRAFT_TYPE_SCHEDULED,
            postScheduledAt: 1620100000000,
        };

        renderWithIntlAndTheme(<DraftAndScheduledPostHeader {...scheduledProps}/>);

        expect(screen.getByTestId('scheduled_post_header.scheduled_at')).toBeTruthy();
        expect(screen.getByText('Send on May 5, 2025, 10:00 AM')).toBeTruthy();
    });

    it('renders scheduled post with error correctly', () => {
        const errorProps = {
            ...baseProps,
            draftType: DRAFT_TYPE_SCHEDULED,
            postScheduledAt: 1620100000000,
            scheduledPostErrorCode: 'channel_not_found',
        };

        renderWithIntlAndTheme(<DraftAndScheduledPostHeader {...errorProps}/>);

        expect(screen.getByText('Error message')).toBeTruthy();
    });

    it('renders sent scheduled post correctly', () => {
        const sentProps = {
            ...baseProps,
            draftType: DRAFT_TYPE_SCHEDULED,
            postScheduledAt: 1620100000000,
            scheduledPostErrorCode: 'post_send_success_delete_failed',
        };

        renderWithIntlAndTheme(<DraftAndScheduledPostHeader {...sentProps}/>);

        expect(screen.getByText('Sent')).toBeTruthy();
    });
});

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {switchToThread} from '@actions/local/thread';
import {switchToChannelById} from '@actions/remote/channel';
import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED} from '@constants/draft';
import {openAsBottomSheet} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import DraftAndScheduledPost from './draft_scheduled_post';

import type {AvailableScreens} from '@typings/screens/navigation';

jest.mock('@actions/local/thread', () => ({
    switchToThread: jest.fn(),
}));

jest.mock('@actions/remote/channel', () => ({
    switchToChannelById: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    openAsBottomSheet: jest.fn(),
}));

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn().mockReturnValue('https://server.com'),
}));

jest.mock('@components/draft_scheduled_post_header', () => () => null);

jest.mock('./draft_scheduled_post_container', () => () => null);

describe('DraftAndScheduledPost', () => {
    const baseProps: Parameters<typeof DraftAndScheduledPost>[0] = {
        channel: TestHelper.fakeChannelModel({
            id: 'channel-id',
            teamId: 'team-id',
        }),
        location: 'location' as AvailableScreens,
        post: TestHelper.fakeDraftModel({
            rootId: '',
            updateAt: 1234567890,
            metadata: {},
            files: [] as FileInfo[],
        }),
        layoutWidth: 300,
        isPostPriorityEnabled: false,
        draftType: DRAFT_TYPE_DRAFT,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly for draft', () => {
        renderWithIntlAndTheme(<DraftAndScheduledPost {...baseProps}/>);
        expect(screen.getByTestId('draft_post')).toBeTruthy();
    });

    it('renders error line for scheduled post with error', () => {
        const props = {
            ...baseProps,
            draftType: DRAFT_TYPE_SCHEDULED,
            post: TestHelper.fakeScheduledPostModel({
                rootId: '',
                updateAt: 1234567890,
                metadata: {},
                files: [] as FileInfo[],
                scheduledAt: 1234567890,
                errorCode: 'some_error',
            }),
        };
        renderWithIntlAndTheme(<DraftAndScheduledPost {...props}/>);

        expect(screen.getByTestId('draft_post.error_line')).toBeTruthy();
    });

    it('does not render error line for scheduled post without error', () => {
        const props = {
            ...baseProps,
            draftType: DRAFT_TYPE_SCHEDULED,
            post: TestHelper.fakeScheduledPostModel({
                rootId: '',
                updateAt: 1234567890,
                metadata: {},
                files: [] as FileInfo[],
                scheduledAt: 1234567890,
                errorCode: '',
            }),
        };
        renderWithIntlAndTheme(<DraftAndScheduledPost {...props}/>);

        expect(screen.queryByTestId('draft_post.error_line')).toBeNull();
    });

    it('does not render error line for draft posts', () => {
        renderWithIntlAndTheme(<DraftAndScheduledPost {...baseProps}/>);

        expect(screen.queryByTestId('draft_post.error_line')).toBeNull();
    });

    it('renders post priority when enabled and present', () => {
        const props = {
            ...baseProps,
            isPostPriorityEnabled: true,
            post: TestHelper.fakeDraftModel({
                rootId: '',
                updateAt: 1234567890,
                files: [] as FileInfo[],
                metadata: {
                    priority: {
                        priority: 'important',
                    },
                },
            }),
        };
        renderWithIntlAndTheme(<DraftAndScheduledPost {...props}/>);

        expect(screen.getByTestId('draft_post.priority')).toBeTruthy();
    });

    it('does not render post priority when disabled', () => {
        const props = {
            ...baseProps,
            isPostPriorityEnabled: false,
            post: TestHelper.fakeDraftModel({
                rootId: '',
                updateAt: 1234567890,
                files: [] as FileInfo[],
                metadata: {
                    priority: {
                        priority: 'important',
                    },
                },
            }),
        };
        renderWithIntlAndTheme(<DraftAndScheduledPost {...props}/>);

        expect(screen.queryByTestId('draft_post.priority')).toBeNull();
    });

    it('does not render post priority when not present in metadata', () => {
        const props = {
            ...baseProps,
            isPostPriorityEnabled: true,
            post: TestHelper.fakeDraftModel({
                rootId: '',
                updateAt: 1234567890,
                files: [] as FileInfo[],
                metadata: {},
            }),
        };
        renderWithIntlAndTheme(<DraftAndScheduledPost {...props}/>);

        expect(screen.queryByTestId('draft_post.priority')).toBeNull();
    });

    it('navigates to thread when post has rootId', () => {
        const props = {
            ...baseProps,
            post: TestHelper.fakeDraftModel({
                rootId: 'root-id',
                updateAt: 1234567890,
                metadata: {},
                files: [] as FileInfo[],
            }),
        };
        renderWithIntlAndTheme(<DraftAndScheduledPost {...props}/>);

        fireEvent.press(screen.getByTestId('draft_post'));

        expect(switchToThread).toHaveBeenCalledWith('https://server.com', 'root-id', false);
        expect(switchToChannelById).not.toHaveBeenCalled();
    });

    it('navigates to channel when post has no rootId', () => {
        renderWithIntlAndTheme(<DraftAndScheduledPost {...baseProps}/>);

        fireEvent.press(screen.getByTestId('draft_post'));

        expect(switchToChannelById).toHaveBeenCalledWith('https://server.com', 'channel-id', 'team-id', false);
        expect(switchToThread).not.toHaveBeenCalled();
    });

    it('opens options on long press for draft', () => {
        const mockOpenAsBottonSheet = jest.mocked(openAsBottomSheet);
        renderWithIntlAndTheme(<DraftAndScheduledPost {...baseProps}/>);

        fireEvent(screen.getByTestId('draft_post'), 'longPress');

        expect(mockOpenAsBottonSheet).toHaveBeenCalled();
        expect(mockOpenAsBottonSheet.mock.calls[0][0].props?.draftType).toBe(DRAFT_TYPE_DRAFT);
    });

    it('opens options on long press for scheduled post', () => {
        const mockOpenAsBottonSheet = jest.mocked(openAsBottomSheet);
        const props = {
            ...baseProps,
            draftType: DRAFT_TYPE_SCHEDULED,
            post: TestHelper.fakeScheduledPostModel({
                rootId: '',
                updateAt: 1234567890,
                metadata: {},
                files: [] as FileInfo[],
                scheduledAt: 1234567890,
            }),
        };
        renderWithIntlAndTheme(<DraftAndScheduledPost {...props}/>);

        fireEvent(screen.getByTestId('draft_post'), 'longPress');

        expect(mockOpenAsBottonSheet).toHaveBeenCalled();
        expect(mockOpenAsBottonSheet.mock.calls[0][0].props?.draftType).toBe(DRAFT_TYPE_SCHEDULED);
    });
});

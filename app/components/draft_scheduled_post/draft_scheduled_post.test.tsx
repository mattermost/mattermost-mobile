// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {switchToThread} from '@actions/local/thread';
import {switchToChannelById} from '@actions/remote/channel';
import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED} from '@constants/draft';
import {openAsBottomSheet} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import DraftAndScheduledPost from './draft_scheduled_post';

import type ChannelModel from '@typings/database/models/servers/channel';
import type DraftModel from '@typings/database/models/servers/draft';
import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

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

jest.mock('@components/draft_scheduled_post_header', () => {
    const MockHeader = () => null;
    return MockHeader;
});

jest.mock('./draft_scheduled_post_container', () => {
    const MockContainer = () => null;
    return MockContainer;
});

describe('DraftAndScheduledPost', () => {
    const baseProps: Parameters<typeof DraftAndScheduledPost>[0] = {
        channel: {
            id: 'channel-id',
            teamId: 'team-id',
        } as ChannelModel,
        location: 'location',
        post: {
            rootId: '',
            updateAt: 1234567890,
            metadata: {},
            files: [] as FileInfo[],
        } as DraftModel,
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

    it('renders correctly for scheduled post', () => {
        const props = {
            ...baseProps,
            draftType: DRAFT_TYPE_SCHEDULED,
            post: {
                ...baseProps.post,
                scheduledAt: 1234567890,
                errorCode: '',
            } as ScheduledPostModel,
        };
        renderWithIntlAndTheme(<DraftAndScheduledPost {...props}/>);
        expect(screen.getByTestId('draft_post')).toBeTruthy();
    });

    it('renders error line for scheduled post with error', () => {
        const props = {
            ...baseProps,
            draftType: DRAFT_TYPE_SCHEDULED,
            post: {
                ...baseProps.post,
                scheduledAt: 1234567890,
                errorCode: 'some_error',
            } as ScheduledPostModel,
        };
        renderWithIntlAndTheme(<DraftAndScheduledPost {...props}/>);

        // The error line view should be present
        expect(screen.getByTestId('draft_post').findAllByType('View')[1]).toBeTruthy();
    });

    it('renders post priority when enabled and present', () => {
        const props = {
            ...baseProps,
            isPostPriorityEnabled: true,
            post: {
                ...baseProps.post,
                metadata: {
                    priority: {
                        priority: 'important',
                    },
                },
            } as DraftModel,
        };
        renderWithIntlAndTheme(<DraftAndScheduledPost {...props}/>);

        // The priority view should be present
        expect(screen.getByTestId('draft_post').findAllByType('View')[2]).toBeTruthy();
    });

    it('navigates to thread when post has rootId', () => {
        const props = {
            ...baseProps,
            post: {
                ...baseProps.post,
                rootId: 'root-id',
            } as DraftModel,
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
            post: {
                ...baseProps.post,
                scheduledAt: 1234567890,
            } as ScheduledPostModel,
        };
        renderWithIntlAndTheme(<DraftAndScheduledPost {...props}/>);

        fireEvent(screen.getByTestId('draft_post'), 'longPress');

        expect(mockOpenAsBottonSheet).toHaveBeenCalled();
        expect(mockOpenAsBottonSheet.mock.calls[0][0].props?.draftType).toBe(DRAFT_TYPE_SCHEDULED);
    });
});

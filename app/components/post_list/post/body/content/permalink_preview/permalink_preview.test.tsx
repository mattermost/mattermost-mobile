// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import PermalinkPreview from './permalink_preview';

describe('components/post_list/post/body/content/permalink_preview/PermalinkPreview', () => {
    const baseProps: Parameters<typeof PermalinkPreview>[0] = {
        embedData: {
            post_id: 'post-123',
            post: TestHelper.fakePost({
                id: 'post-123',
                user_id: 'user-123',
                message: 'This is a test message',
                create_at: 1234567890000,
                edit_at: 0,
            }),
            team_name: 'test-team',
            channel_display_name: 'Test Channel',
            channel_type: 'O',
            channel_id: 'channel-123',
        },
        showPermalinkPreviews: true,
        author: TestHelper.fakeUserModel({
            id: 'user-123',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
        }),
        locale: 'en',
        teammateNameDisplay: 'username',
    };

    it('should render permalink preview correctly', () => {
        const {getByText} = renderWithIntlAndTheme(
            <PermalinkPreview {...baseProps}/>,
        );

        expect(getByText('testuser')).toBeTruthy();
        expect(getByText('This is a test message')).toBeTruthy();
        expect(getByText('Originally posted in ~Test Channel')).toBeTruthy();
    });

    it('should not render when showPermalinkPreviews is false', () => {
        const props = {...baseProps, showPermalinkPreviews: false};
        const {queryByText} = renderWithIntlAndTheme(
            <PermalinkPreview {...props}/>,
        );

        expect(queryByText('testuser')).toBeNull();
        expect(queryByText('This is a test message')).toBeNull();
    });

    it('should not render when post is missing', () => {
        const props = {
            ...baseProps,
            embedData: {
                ...baseProps.embedData,
                post: undefined as unknown as Post,
            },
        };
        const {queryByText} = renderWithIntlAndTheme(
            <PermalinkPreview {...props}/>,
        );

        expect(queryByText('testuser')).toBeNull();
    });

    it('should handle press event without crashing', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <PermalinkPreview {...baseProps}/>,
        );
        const permalinkContainer = getByTestId('permalink-preview-container');
        expect(() => {
            fireEvent.press(permalinkContainer);
        }).not.toThrow();
        expect(getByTestId('permalink-preview-container')).toBeTruthy();
    });

    it('should display author name from user model', () => {
        const {getByText} = renderWithIntlAndTheme(
            <PermalinkPreview {...baseProps}/>,
        );

        expect(getByText('testuser')).toBeTruthy();
    });

    it('should display "Someone" when no author is provided', () => {
        const props = {
            ...baseProps,
            author: undefined,
            embedData: {
                ...baseProps.embedData,
                post: TestHelper.fakePost({
                    id: 'post-123',
                    user_id: '',
                    message: 'Test message',
                }),
            },
        };
        const {getByText} = renderWithIntlAndTheme(
            <PermalinkPreview {...props}/>,
        );

        expect(getByText('Someone')).toBeTruthy();
    });

    it('should display channel name with ~ prefix for public channels', () => {
        const {getByText} = renderWithIntlAndTheme(
            <PermalinkPreview {...baseProps}/>,
        );

        expect(getByText('Originally posted in ~Test Channel')).toBeTruthy();
    });

    it('should display channel name with @ prefix for direct messages', () => {
        const props = {
            ...baseProps,
            embedData: {
                ...baseProps.embedData,
                channel_type: 'D',
                channel_display_name: 'testuser',
            },
        };
        const {getByText} = renderWithIntlAndTheme(
            <PermalinkPreview {...props}/>,
        );

        expect(getByText('Originally posted in @testuser')).toBeTruthy();
    });

    it('should truncate long messages', () => {
        const longMessage = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6';
        const props = {
            ...baseProps,
            embedData: {
                ...baseProps.embedData,
                post: TestHelper.fakePost({
                    id: 'post-123',
                    user_id: 'user-123',
                    message: longMessage,
                }),
            },
        };
        const {getByText} = renderWithIntlAndTheme(
            <PermalinkPreview {...props}/>,
        );

        expect(getByText('Line 1\nLine 2\nLine 3\nLine 4...')).toBeTruthy();
    });

    it('should handle empty message', () => {
        const props = {
            ...baseProps,
            embedData: {
                ...baseProps.embedData,
                post: TestHelper.fakePost({
                    id: 'post-123',
                    user_id: 'user-123',
                    message: '',
                }),
            },
        };
        const {queryByText} = renderWithIntlAndTheme(
            <PermalinkPreview {...props}/>,
        );

        // Should render but with empty message
        expect(queryByText('This is a test message')).toBeNull();
    });

    it('should show edited indicator when post is edited', () => {
        const props = {
            ...baseProps,
            embedData: {
                ...baseProps.embedData,
                post: TestHelper.fakePost({
                    id: 'post-123',
                    user_id: 'user-123',
                    message: 'Edited message',
                    edit_at: 1234567891000,
                    create_at: 1234567890000,
                }),
            },
        };
        const {getByTestId} = renderWithIntlAndTheme(
            <PermalinkPreview {...props}/>,
        );

        expect(getByTestId('permalink_preview.edited_indicator_separate')).toBeTruthy();
    });

    it('should not show edited indicator when post is not edited', () => {
        const {queryByTestId} = renderWithIntlAndTheme(
            <PermalinkPreview {...baseProps}/>,
        );

        expect(queryByTestId('permalink_preview.edited_indicator_separate')).toBeNull();
    });

    it('should display formatted time correctly', () => {
        const {getByText} = renderWithIntlAndTheme(
            <PermalinkPreview {...baseProps}/>,
        );

        // FormattedTime component should render the time text
        expect(getByText('11:31 PM')).toBeTruthy();
    });

    it('should display profile picture', () => {
        const {root} = renderWithIntlAndTheme(
            <PermalinkPreview {...baseProps}/>,
        );

        // Profile picture should be rendered (check for the image component)
        const profilePicture = root.findByType('ViewManagerAdapter_ExpoImage');
        expect(profilePicture).toBeTruthy();
    });
});

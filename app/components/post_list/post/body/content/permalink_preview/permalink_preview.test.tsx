// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import {showPermalink} from '@actions/remote/permalink';
import Markdown from '@components/markdown';
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import PermalinkPreview from './permalink_preview';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('@actions/remote/permalink', () => ({
    showPermalink: jest.fn(),
}));

jest.mock('@components/markdown', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(Markdown).mockImplementation((props) =>
    React.createElement('Text', {testID: 'markdown'}, props.value),
);

describe('components/post_list/post/body/content/permalink_preview/PermalinkPreview', () => {
    let database: Database;
    let operator: ServerDataOperator;
    const serverUrl = 'http://localhost:8065';

    beforeEach(async () => {
        jest.clearAllMocks();

        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;

        // Setup basic configs
        await operator.handleConfigs({
            configs: [
                {id: 'EnablePermalinkPreviews', value: 'true'},
                {id: 'TeammateNameDisplay', value: 'username'},
                {id: 'EnablePublicLink', value: 'true'},
                {id: 'EnableSecureFilePreview', value: 'false'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        // Add a current user
        const currentUser = TestHelper.fakeUser({id: 'current-user', locale: 'en'});
        await operator.handleUsers({users: [currentUser], prepareRecordsOnly: false});
        await operator.handleSystem({
            systems: [{id: 'currentUserId', value: currentUser.id}],
            prepareRecordsOnly: false,
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    const renderPermalinkPreview = (props: Parameters<typeof PermalinkPreview>[0]) => {
        return renderWithEverything(<PermalinkPreview {...props}/>, {database, serverUrl});
    };

    const baseProps: Parameters<typeof PermalinkPreview>[0] = {
        embedData: {
            post_id: 'post-123',
            post: TestHelper.fakePost({
                id: 'post-123',
                user_id: 'user-123',
                message: 'This is a test message',
                create_at: 1234567890000,
                edit_at: 0,
                metadata: {
                    embeds: [{
                        type: 'opengraph' as PostEmbedType,
                        url: 'https://example.com',
                        data: {
                            title: 'Example Title',
                            description: 'Example Description',
                        },
                    }],
                },
            }),
            team_name: 'test-team',
            channel_display_name: 'Test Channel',
            channel_type: 'O',
            channel_id: 'channel-123',
        },
        author: TestHelper.fakeUserModel({
            id: 'user-123',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
        }),
        currentUser: TestHelper.fakeUserModel({
            id: 'current-user',
            locale: 'en',
        }),
        post: TestHelper.fakePostModel({
            id: 'post-123',
            userId: 'user-123',
            message: 'This is a test message',
            createAt: 1234567890000,
            editAt: 0,
        }),
        isMilitaryTime: false,
        teammateNameDisplay: 'username',
        location: Screens.CHANNEL,
        isOriginPostDeleted: false,
        parentLocation: Screens.CHANNEL,
        parentPostId: 'parent-post-123',
    };

    it('should render permalink preview correctly', () => {
        const {getByText} = renderPermalinkPreview(baseProps);

        expect(getByText('testuser')).toBeTruthy();
        expect(getByText('This is a test message')).toBeTruthy();
        expect(getByText('Originally posted in ~Test Channel')).toBeTruthy();
    });

    it('should not render when origin post is deleted', () => {
        const props = {...baseProps, isOriginPostDeleted: true};
        const {queryByText} = renderPermalinkPreview(props);

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
            post: undefined,
        };
        const {queryByText} = renderPermalinkPreview(props);

        expect(queryByText('testuser')).toBeNull();
    });

    it('should handle press event without crashing', () => {
        const {getByTestId} = renderPermalinkPreview(baseProps);
        const permalinkContainer = getByTestId('permalink-preview-container');
        expect(() => {
            fireEvent.press(permalinkContainer);
        }).not.toThrow();
        expect(getByTestId('permalink-preview-container')).toBeTruthy();
    });

    it('should call showPermalink with correct parameters when container is pressed', () => {
        const mockShowPermalink = jest.mocked(showPermalink);
        const {getByTestId} = renderPermalinkPreview(baseProps);
        const permalinkContainer = getByTestId('permalink-preview-container');

        fireEvent.press(permalinkContainer);

        expect(mockShowPermalink).toHaveBeenCalledWith(
            serverUrl,
            baseProps.embedData.team_name,
            baseProps.embedData.post_id,
        );
    });

    it('should call showPermalink even when team_name is empty for DM posts', () => {
        const mockShowPermalink = jest.mocked(showPermalink);
        const dmProps = {
            ...baseProps,
            embedData: {
                ...baseProps.embedData,
                team_name: '',
                channel_type: 'D',
                channel_display_name: 'testuser',
            },
        };
        const {getByTestId} = renderPermalinkPreview(dmProps);
        const permalinkContainer = getByTestId('permalink-preview-container');

        fireEvent.press(permalinkContainer);

        expect(mockShowPermalink).toHaveBeenCalledWith(
            serverUrl,
            '',
            baseProps.embedData.post_id,
        );
    });

    it('should display author name from user model', () => {
        const {getByText} = renderPermalinkPreview(baseProps);

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
                    metadata: {
                        embeds: [{
                            type: 'opengraph' as PostEmbedType,
                            url: 'https://example.com',
                            data: {
                                title: 'Example Title',
                                description: 'Example Description',
                            },
                        }],
                    },
                }),
            },
        };
        const {getByText} = renderPermalinkPreview(props);

        expect(getByText('Someone')).toBeTruthy();
    });

    it('should display channel name with ~ prefix for public channels', () => {
        const {getByText} = renderPermalinkPreview(baseProps);

        expect(getByText('Originally posted in ~Test Channel')).toBeTruthy();
    });

    it('should display channel name with ~ prefix for direct messages', () => {
        const props = {
            ...baseProps,
            embedData: {
                ...baseProps.embedData,
                channel_type: 'D',
                channel_display_name: 'testuser',
            },
        };
        const {getByText} = renderPermalinkPreview(props);

        expect(getByText('Originally posted in ~testuser')).toBeTruthy();
    });

    it('should truncate long messages', () => {
        const longMessage = 'This is a very long message that should be truncated when it exceeds the maximum character limit of 150 characters for permalink previews in the mobile app.';
        const props = {
            ...baseProps,
            embedData: {
                ...baseProps.embedData,
                post: TestHelper.fakePost({
                    id: 'post-123',
                    user_id: 'user-123',
                    message: longMessage,
                    metadata: {
                        embeds: [{
                            type: 'opengraph' as PostEmbedType,
                            url: 'https://example.com',
                            data: {
                                title: 'Example Title',
                                description: 'Example Description',
                            },
                        }],
                    },
                }),
            },
        };
        const {getByText} = renderPermalinkPreview(props);

        const expectedTruncated = longMessage.substring(0, 150) + '...';
        expect(getByText(expectedTruncated)).toBeTruthy();
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
                    metadata: {
                        embeds: [{
                            type: 'opengraph' as PostEmbedType,
                            url: 'https://example.com',
                            data: {
                                title: 'Example Title',
                                description: 'Example Description',
                            },
                        }],
                    },
                }),
            },
        };
        const {queryByText} = renderPermalinkPreview(props);

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
                    metadata: {
                        embeds: [{
                            type: 'opengraph' as PostEmbedType,
                            url: 'https://example.com',
                            data: {
                                title: 'Example Title',
                                description: 'Example Description',
                            },
                        }],
                    },
                }),
            },
        };
        const {getByTestId} = renderPermalinkPreview(props);

        expect(getByTestId('permalink_preview.edited_indicator_separate')).toBeTruthy();
    });

    it('should not show edited indicator when post is not edited', () => {
        const {queryByTestId} = renderPermalinkPreview(baseProps);

        expect(queryByTestId('permalink_preview.edited_indicator_separate')).toBeNull();
    });

    it('should display formatted time correctly', () => {
        const {getByText} = renderPermalinkPreview(baseProps);
        expect(getByText('11:31 PM')).toBeTruthy();
    });

    describe('file attachments', () => {
        it('should render PermalinkFiles component when post has file attachments', () => {
            const fileInfo = TestHelper.fakeFileInfo({
                id: 'file-123',
                name: 'document.pdf',
                mime_type: 'application/pdf',
                size: 1048576,
            });

            const propsWithFiles = {
                ...baseProps,
                embedData: {
                    ...baseProps.embedData,
                    post: TestHelper.fakePost({
                        id: 'post-123',
                        user_id: 'user-123',
                        message: 'Post with file attachment',
                        metadata: {
                            files: [fileInfo],
                            embeds: [{
                                type: 'opengraph' as PostEmbedType,
                                url: 'https://example.com',
                                data: {
                                    title: 'Example Title',
                                    description: 'Example Description',
                                },
                            }],
                        },
                    }),
                },
            };

            const {getByText, getByTestId} = renderPermalinkPreview(propsWithFiles);

            expect(getByText('Post with file attachment')).toBeTruthy();

            expect(getByTestId('permalink-files-container')).toBeTruthy();
        });

        it('should render PermalinkFiles with multiple file attachments', () => {
            const fileInfos = [
                TestHelper.fakeFileInfo({
                    id: 'file-1',
                    name: 'image.jpg',
                    mime_type: 'image/jpeg',
                    size: 2048576,
                }),
                TestHelper.fakeFileInfo({
                    id: 'file-2',
                    name: 'document.pdf',
                    mime_type: 'application/pdf',
                    size: 1048576,
                }),
            ];

            const propsWithMultipleFiles = {
                ...baseProps,
                embedData: {
                    ...baseProps.embedData,
                    post: TestHelper.fakePost({
                        id: 'post-123',
                        user_id: 'user-123',
                        message: 'Post with multiple attachments',
                        metadata: {
                            files: fileInfos,
                            embeds: [{
                                type: 'opengraph' as PostEmbedType,
                                url: 'https://example.com',
                                data: {
                                    title: 'Example Title',
                                    description: 'Example Description',
                                },
                            }],
                        },
                    }),
                },
            };

            const {getByText, getByTestId} = renderPermalinkPreview(propsWithMultipleFiles);

            expect(getByText('Post with multiple attachments')).toBeTruthy();

            expect(getByTestId('permalink-files-container')).toBeTruthy();
        });

        it('should not render PermalinkFiles when post has no file attachments', () => {
            const propsWithoutFiles = {
                ...baseProps,
                embedData: {
                    ...baseProps.embedData,
                    post: TestHelper.fakePost({
                        id: 'post-123',
                        user_id: 'user-123',
                        message: 'Post without files',
                        metadata: {
                            embeds: [{
                                type: 'opengraph' as PostEmbedType,
                                url: 'https://example.com',
                                data: {
                                    title: 'Example Title',
                                    description: 'Example Description',
                                },
                            }],
                        },
                    }),
                },
            };

            const {getByText, queryByTestId} = renderPermalinkPreview(propsWithoutFiles);

            expect(getByText('Post without files')).toBeTruthy();

            expect(queryByTestId('permalink-files-container')).toBeNull();
        });

        it('should not render PermalinkFiles when files array is empty', () => {
            const propsWithEmptyFiles = {
                ...baseProps,
                embedData: {
                    ...baseProps.embedData,
                    post: TestHelper.fakePost({
                        id: 'post-123',
                        user_id: 'user-123',
                        message: 'Post with empty files',
                        metadata: {
                            files: [],
                            embeds: [{
                                type: 'opengraph' as PostEmbedType,
                                url: 'https://example.com',
                                data: {
                                    title: 'Example Title',
                                    description: 'Example Description',
                                },
                            }],
                        },
                    }),
                },
            };

            const {getByText, queryByTestId} = renderPermalinkPreview(propsWithEmptyFiles);

            expect(getByText('Post with empty files')).toBeTruthy();

            expect(queryByTestId('permalink-files-container')).toBeNull();
        });
    });
});

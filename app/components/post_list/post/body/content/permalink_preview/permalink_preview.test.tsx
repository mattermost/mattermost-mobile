// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import Markdown from '@components/markdown';
import {Screens} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import PermalinkPreview from './permalink_preview';

jest.mock('@components/markdown', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(Markdown).mockImplementation((props) =>
    React.createElement('Text', {testID: 'markdown'}, props.value),
);

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
        location: Screens.CHANNEL,
        isOriginPostDeleted: false,
        canDownloadFiles: true,
        enableSecureFilePreview: false,
        parentLocation: Screens.CHANNEL,
        parentPostId: 'parent-post-123',
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

    it('should not render when origin post is deleted', () => {
        const props = {...baseProps, isOriginPostDeleted: true};
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

    it('should display channel name with ~ prefix for direct messages', () => {
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

        expect(getByText('Originally posted in ~testuser')).toBeTruthy();
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

    it('should enable mentions in markdown component', () => {
        const currentUser = TestHelper.fakeUserModel({
            id: 'current-user-123',
            mentionKeys: [{key: 'testuser', caseSensitive: false}],
        });
        const props = {...baseProps, currentUser};
        renderWithIntlAndTheme(
            <PermalinkPreview {...props}/>,
        );

        expect(Markdown).toHaveBeenCalledWith(
            expect.objectContaining({
                disableAtMentions: false,
                mentionKeys: [{key: 'testuser', caseSensitive: false}],
            }),
            expect.any(Object),
        );
    });

    it('should use empty mention keys when currentUser is not provided', () => {
        renderWithIntlAndTheme(
            <PermalinkPreview {...baseProps}/>,
        );

        expect(Markdown).toHaveBeenCalledWith(
            expect.objectContaining({
                disableAtMentions: false,
                mentionKeys: [],
            }),
            expect.any(Object),
        );
    });

    describe('External Links', () => {
        it('should not render external link when no embeds are present', () => {
            const {queryByTestId} = renderWithIntlAndTheme(
                <PermalinkPreview {...baseProps}/>,
            );

            expect(queryByTestId('permalink-preview-external-link')).toBeNull();
        });

        it('should render external link when opengraph embed is present', () => {
            const propsWithLink = {
                ...baseProps,
                embedData: {
                    ...baseProps.embedData,
                    post: {
                        ...baseProps.embedData.post,
                        metadata: {
                            ...baseProps.embedData.post.metadata,
                            embeds: [{
                                type: 'opengraph' as PostEmbedType,
                                url: 'https://example.com',
                                data: {
                                    title: 'Example Website',
                                    description: 'This is an example website',
                                    site_name: 'Example',
                                },
                            }],
                        },
                    },
                },
            };

            const {getByTestId, getByText} = renderWithIntlAndTheme(
                <PermalinkPreview {...propsWithLink}/>,
            );

            expect(getByTestId('permalink-preview-external-link')).toBeTruthy();
            expect(getByText('Example Website')).toBeTruthy();
            expect(getByText('This is an example website')).toBeTruthy();
        });

        it('should show fallback text when link data is incomplete', () => {
            const propsWithIncompleteLink = {
                ...baseProps,
                embedData: {
                    ...baseProps.embedData,
                    post: {
                        ...baseProps.embedData.post,
                        metadata: {
                            ...baseProps.embedData.post.metadata,
                            embeds: [{
                                type: 'opengraph' as PostEmbedType,
                                url: 'https://example.com',
                                data: {},
                            }],
                        },
                    },
                },
            };

            const {getByText} = renderWithIntlAndTheme(
                <PermalinkPreview {...propsWithIncompleteLink}/>,
            );

            expect(getByText('External Link')).toBeTruthy();
            expect(getByText('https://example.com')).toBeTruthy();
        });

        it('should prioritize title over site_name', () => {
            const propsWithBothTitleAndSiteName = {
                ...baseProps,
                embedData: {
                    ...baseProps.embedData,
                    post: {
                        ...baseProps.embedData.post,
                        metadata: {
                            ...baseProps.embedData.post.metadata,
                            embeds: [{
                                type: 'opengraph' as PostEmbedType,
                                url: 'https://example.com',
                                data: {
                                    title: 'Page Title',
                                    site_name: 'Site Name',
                                    description: 'Description text',
                                },
                            }],
                        },
                    },
                },
            };

            const {getByText, queryByText} = renderWithIntlAndTheme(
                <PermalinkPreview {...propsWithBothTitleAndSiteName}/>,
            );

            expect(getByText('Page Title')).toBeTruthy();
            expect(queryByText('Site Name')).toBeNull();
        });

        it('should not render external link for non-opengraph embeds', () => {
            const propsWithImageEmbed = {
                ...baseProps,
                embedData: {
                    ...baseProps.embedData,
                    post: {
                        ...baseProps.embedData.post,
                        metadata: {
                            ...baseProps.embedData.post.metadata,
                            embeds: [{
                                type: 'image' as PostEmbedType,
                                url: 'https://example.com/image.jpg',
                                data: {},
                            }],
                        },
                    },
                },
            };

            const {queryByTestId} = renderWithIntlAndTheme(
                <PermalinkPreview {...propsWithImageEmbed}/>,
            );

            expect(queryByTestId('permalink-preview-external-link')).toBeNull();
        });
    });

    describe('File Attachments', () => {
        const mockFileInfo: FileInfo = {
            id: 'file-123',
            name: 'test-file.pdf',
            extension: 'pdf',
            size: 1024,
            mime_type: 'application/pdf',
            width: 0,
            height: 0,
            has_preview_image: false,
            user_id: 'user-123',
        };

        const createPropsWithFiles = (files: FileInfo[]) => ({
            ...baseProps,
            embedData: {
                ...baseProps.embedData,
                post: {
                    ...baseProps.embedData.post,
                    metadata: {
                        files,
                    },
                },
            },
        });

        it('should not render PermalinkFiles when filesInfo is empty', () => {
            const {queryByTestId} = renderWithIntlAndTheme(
                <PermalinkPreview {...baseProps}/>,
            );

            expect(queryByTestId('files-container')).toBeNull();
        });

        it('should render PermalinkFiles when filesInfo has files', () => {
            const props = createPropsWithFiles([mockFileInfo]);
            const {getByTestId} = renderWithIntlAndTheme(
                <PermalinkPreview {...props}/>,
            );

            expect(getByTestId('files-container')).toBeTruthy();
        });

        it('should render multiple file attachments', () => {
            const multipleFiles = [
                mockFileInfo,
                {...mockFileInfo, id: 'file-456', name: 'image.jpg', mime_type: 'image/jpeg'},
                {...mockFileInfo, id: 'file-789', name: 'document.txt', mime_type: 'text/plain'},
            ];
            const props = createPropsWithFiles(multipleFiles);
            const {getByTestId} = renderWithIntlAndTheme(
                <PermalinkPreview {...props}/>,
            );

            expect(getByTestId('files-container')).toBeTruthy();
        });

        it('should handle undefined filesInfo gracefully', () => {
            const props = {
                ...baseProps,
                embedData: {
                    ...baseProps.embedData,
                    post: {
                        ...baseProps.embedData.post,
                        metadata: {},
                    },
                },
            };

            expect(() => {
                renderWithIntlAndTheme(<PermalinkPreview {...props}/>);
            }).not.toThrow();
        });

        it('should display file names correctly', () => {
            const filesWithNames = [
                {...mockFileInfo, id: 'file-1', name: 'important-document.pdf', mime_type: 'application/pdf'},
                {...mockFileInfo, id: 'file-2', name: 'meeting-notes.docx', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'},
                {...mockFileInfo, id: 'file-3', name: 'vacation-photo.jpg', mime_type: 'image/jpeg', width: 1920, height: 1080, has_preview_image: true},
            ];
            const props = createPropsWithFiles(filesWithNames);

            const {getByText, queryByText} = renderWithIntlAndTheme(
                <PermalinkPreview {...props}/>,
            );

            expect(getByText('important-document.pdf')).toBeTruthy();
            expect(getByText('meeting-notes.docx')).toBeTruthy();

            expect(queryByText('vacation-photo.jpg')).toBeNull();
        });

        it('should display file sizes correctly', () => {
            const filesWithSizes = [
                {...mockFileInfo, id: 'file-1', name: 'small-file.txt', size: 1024}, // 1024 B
                {...mockFileInfo, id: 'file-2', name: 'large-file.pdf', size: 5242880}, // 5 MB
            ];
            const props = createPropsWithFiles(filesWithSizes);

            const {getByText} = renderWithIntlAndTheme(
                <PermalinkPreview {...props}/>,
            );

            expect(getByText('1024 B')).toBeTruthy();
            expect(getByText('5 MB')).toBeTruthy();
        });

        it('should render different file types with appropriate icons', () => {
            const mixedFiles = [
                {...mockFileInfo, id: 'file-1', name: 'document.pdf', mime_type: 'application/pdf', extension: 'pdf'},
                {...mockFileInfo, id: 'file-2', name: 'spreadsheet.xlsx', mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: 'xlsx'},
            ];
            const props = createPropsWithFiles(mixedFiles);

            const {getByTestId, getByText} = renderWithIntlAndTheme(
                <PermalinkPreview {...props}/>,
            );

            expect(getByTestId('files-container')).toBeTruthy();

            expect(getByText('document.pdf')).toBeTruthy();
            expect(getByText('spreadsheet.xlsx')).toBeTruthy();
        });

        it('should handle files with zero size', () => {
            const fileWithZeroSize = {
                ...mockFileInfo,
                id: 'file-zero',
                name: 'empty-file.txt',
                size: 0,
            };
            const props = createPropsWithFiles([fileWithZeroSize]);

            const {getByText} = renderWithIntlAndTheme(
                <PermalinkPreview {...props}/>,
            );

            expect(getByText('empty-file.txt')).toBeTruthy();
            expect(getByText('0 B')).toBeTruthy();
        });

        it('should display file extension correctly', () => {
            const fileWithExtension = {
                ...mockFileInfo,
                id: 'file-ext',
                name: 'presentation.pptx',
                extension: 'pptx',
                mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                size: 2097152,
            };
            const props = createPropsWithFiles([fileWithExtension]);

            const {getByText} = renderWithIntlAndTheme(
                <PermalinkPreview {...props}/>,
            );

            expect(getByText('presentation.pptx')).toBeTruthy();
            expect(getByText('2 MB')).toBeTruthy();
        });

        it('should display file size conversions correctly', () => {
            const filesWithVariousSizes = [
                {...mockFileInfo, id: 'file-bytes', name: 'tiny.txt', size: 512},
                {...mockFileInfo, id: 'file-kb', name: 'small.doc', size: 1536},
                {...mockFileInfo, id: 'file-mb', name: 'medium.pdf', size: 3145728},
                {...mockFileInfo, id: 'file-gb', name: 'large.zip', size: 2147483648},
            ];
            const props = createPropsWithFiles(filesWithVariousSizes);

            const {getByText} = renderWithIntlAndTheme(
                <PermalinkPreview {...props}/>,
            );

            expect(getByText('512 B')).toBeTruthy();
            expect(getByText('1 KB')).toBeTruthy();
            expect(getByText('3 MB')).toBeTruthy();
            expect(getByText('2 GB')).toBeTruthy();
        });

        it('should handle edge case file sizes', () => {
            const edgeCaseFiles = [
                {...mockFileInfo, id: 'file-1b', name: 'single-byte.txt', size: 1},
                {...mockFileInfo, id: 'file-1kb', name: 'exactly-1kb.txt', size: 1024},
                {...mockFileInfo, id: 'file-1mb', name: 'exactly-1mb.pdf', size: 1048576},
                {...mockFileInfo, id: 'file-999b', name: 'almost-kb.txt', size: 999},
                {...mockFileInfo, id: 'file-1025b', name: 'just-over-kb.txt', size: 1025},
            ];
            const props = createPropsWithFiles(edgeCaseFiles);

            const {getByText} = renderWithIntlAndTheme(
                <PermalinkPreview {...props}/>,
            );

            expect(getByText('1 B')).toBeTruthy();
            expect(getByText('1024 B')).toBeTruthy();
            expect(getByText('1024 KB')).toBeTruthy();
            expect(getByText('999 B')).toBeTruthy();
            expect(getByText('1 KB')).toBeTruthy();
        });

        it('should display file names with special characters', () => {
            const filesWithSpecialNames = [
                {...mockFileInfo, id: 'file-special1', name: 'file with spaces.pdf', size: 1024},
                {...mockFileInfo, id: 'file-special2', name: 'file-with-dashes.docx', size: 2048},
                {...mockFileInfo, id: 'file-special3', name: 'file_with_underscores.txt', size: 512},
                {...mockFileInfo, id: 'file-special4', name: 'file(with)parentheses.xlsx', size: 4096},
            ];
            const props = createPropsWithFiles(filesWithSpecialNames);

            const {getByText} = renderWithIntlAndTheme(
                <PermalinkPreview {...props}/>,
            );

            expect(getByText('file with spaces.pdf')).toBeTruthy();
            expect(getByText('file-with-dashes.docx')).toBeTruthy();
            expect(getByText('file_with_underscores.txt')).toBeTruthy();
            expect(getByText('file(with)parentheses.xlsx')).toBeTruthy();
        });

        it('should differentiate between image and document file display', () => {
            const mixedFileTypes = [
                {...mockFileInfo, id: 'doc-1', name: 'report.pdf', mime_type: 'application/pdf', extension: 'pdf'},
                {...mockFileInfo, id: 'doc-2', name: 'spreadsheet.xlsx', mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: 'xlsx'},
                {...mockFileInfo, id: 'img-1', name: 'screenshot.png', mime_type: 'image/png', extension: 'png', width: 1024, height: 768, has_preview_image: true},
                {...mockFileInfo, id: 'img-2', name: 'photo.jpeg', mime_type: 'image/jpeg', extension: 'jpeg', width: 1920, height: 1080, has_preview_image: true},
            ];
            const props = createPropsWithFiles(mixedFileTypes);

            const {getByText, queryByText, getByTestId} = renderWithIntlAndTheme(
                <PermalinkPreview {...props}/>,
            );

            expect(getByText('report.pdf')).toBeTruthy();
            expect(getByText('spreadsheet.xlsx')).toBeTruthy();

            expect(queryByText('screenshot.png')).toBeNull();
            expect(queryByText('photo.jpeg')).toBeNull();

            expect(getByTestId('image-row')).toBeTruthy();
            expect(getByTestId('files-container')).toBeTruthy();
        });
    });
});

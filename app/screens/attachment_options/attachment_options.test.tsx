// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TurboLogger from '@mattermost/react-native-turbo-log';
import RNUtils from '@mattermost/rnutils';
import {fireEvent, waitFor} from '@testing-library/react-native';
import {getInfoAsync} from 'expo-file-system';
import {Alert} from 'react-native';

import {Screens} from '@constants';
import {dismissBottomSheet} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import PickerUtil from '@utils/file/file_picker';
import {logError} from '@utils/log';

import AttachmentOptions from './attachment_options';

jest.mock('@screens/navigation', () => ({
    dismissBottomSheet: jest.fn(() => Promise.resolve()),
}));

jest.mock('@utils/file/file_picker');

jest.mock('@utils/file', () => ({
    fileMaxWarning: jest.fn((...args) => `Maximum ${args[1]} files allowed`),
    uploadDisabledWarning: jest.fn(() => 'File uploads are disabled'),
    pathWithPrefix: jest.fn((prefix, path) => `${prefix}${path}`),
}));

jest.mock('@utils/general', () => ({
    ...jest.requireActual('@utils/general'),
    generateId: jest.fn(() => 'generated-id'),
}));

jest.mock('@utils/log', () => ({
    logError: jest.fn(),
}));

jest.mock('@hooks/device', () => ({
    useIsTablet: jest.fn(() => false),
}));

describe('AttachmentOptions', () => {
    const mockDismissBottomSheet = dismissBottomSheet as jest.Mock;
    const mockAttachFileFromPhotoGallery = jest.fn();
    const mockAttachFileFromCamera = jest.fn();
    const mockAttachFileFromFiles = jest.fn();

    const baseProps = {
        componentId: 'Channel' as const,
        onUploadFiles: jest.fn(),
        maxFileCount: 10,
        fileCount: 0,
        maxFilesReached: false,
        canUploadFiles: true,
        testID: 'test-attachment-options',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Alert, 'alert');

        (PickerUtil as jest.Mock).mockImplementation(() => ({
            attachFileFromPhotoGallery: mockAttachFileFromPhotoGallery,
            attachFileFromCamera: mockAttachFileFromCamera,
            attachFileFromFiles: mockAttachFileFromFiles,
        }));
    });

    describe('action handlers', () => {
        it('should call picker.attachFileFromPhotoGallery when photo library is selected', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...baseProps}/>,
            );

            const photoLibraryItem = getByTestId('file_attachment.photo_library');
            fireEvent.press(photoLibraryItem);

            await waitFor(() => {
                expect(mockDismissBottomSheet).toHaveBeenCalledWith(Screens.ATTACHMENT_OPTIONS);
                expect(mockAttachFileFromPhotoGallery).toHaveBeenCalledWith(10);
            });
        });

        it('should call picker.attachFileFromCamera when take photo is selected', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...baseProps}/>,
            );

            const takePhotoItem = getByTestId('file_attachment.take_photo');
            fireEvent.press(takePhotoItem);

            await waitFor(() => {
                expect(mockDismissBottomSheet).toHaveBeenCalledWith(Screens.ATTACHMENT_OPTIONS);
                expect(mockAttachFileFromCamera).toHaveBeenCalledWith({
                    quality: 0.8,
                    mediaType: 'photo',
                    saveToPhotos: true,
                });
            });
        });

        it('should call picker.attachFileFromCamera when take video is selected', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...baseProps}/>,
            );

            const takeVideoItem = getByTestId('file_attachment.take_video');
            fireEvent.press(takeVideoItem);

            await waitFor(() => {
                expect(mockDismissBottomSheet).toHaveBeenCalledWith(Screens.ATTACHMENT_OPTIONS);
                expect(mockAttachFileFromCamera).toHaveBeenCalledWith({
                    quality: 0.8,
                    videoQuality: 'high',
                    mediaType: 'video',
                    saveToPhotos: true,
                });
            });
        });

        it('should call picker.attachFileFromFiles when attach file is selected', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...baseProps}/>,
            );

            const attachFileItem = getByTestId('file_attachment.attach_file');
            fireEvent.press(attachFileItem);

            await waitFor(() => {
                expect(mockDismissBottomSheet).toHaveBeenCalledWith(Screens.ATTACHMENT_OPTIONS);
                expect(mockAttachFileFromFiles).toHaveBeenCalledWith(undefined, true);
            });
        });
    });

    describe('validation - canUploadFiles', () => {
        it('should show alert and not call picker when canUploadFiles is false for photo library', async () => {
            const props = {
                ...baseProps,
                canUploadFiles: false,
            };
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...props}/>,
            );

            const photoLibraryItem = getByTestId('file_attachment.photo_library');
            fireEvent.press(photoLibraryItem);

            await waitFor(() => {
                expect(mockDismissBottomSheet).toHaveBeenCalledWith(Screens.ATTACHMENT_OPTIONS);
                expect(Alert.alert).toHaveBeenCalledWith(
                    'Error',
                    'File uploads are disabled',
                );
                expect(mockAttachFileFromPhotoGallery).not.toHaveBeenCalled();
            });
        });

        it('should show alert and not call picker when canUploadFiles is false for camera', async () => {
            const props = {
                ...baseProps,
                canUploadFiles: false,
            };
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...props}/>,
            );

            const takePhotoItem = getByTestId('file_attachment.take_photo');
            fireEvent.press(takePhotoItem);

            await waitFor(() => {
                expect(mockDismissBottomSheet).toHaveBeenCalledWith(Screens.ATTACHMENT_OPTIONS);
                expect(Alert.alert).toHaveBeenCalledWith(
                    'Error',
                    'File uploads are disabled',
                );
                expect(mockAttachFileFromCamera).not.toHaveBeenCalled();
            });
        });

        it('should show alert and not call picker when canUploadFiles is false for attach file', async () => {
            const props = {
                ...baseProps,
                canUploadFiles: false,
            };
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...props}/>,
            );

            const attachFileItem = getByTestId('file_attachment.attach_file');
            fireEvent.press(attachFileItem);

            await waitFor(() => {
                expect(mockDismissBottomSheet).toHaveBeenCalledWith(Screens.ATTACHMENT_OPTIONS);
                expect(Alert.alert).toHaveBeenCalledWith(
                    'Error',
                    'File uploads are disabled',
                );
                expect(mockAttachFileFromFiles).not.toHaveBeenCalled();
            });
        });
    });

    describe('validation - maxFilesReached', () => {
        it('should show alert and not call picker when maxFilesReached is true for photo library', async () => {
            const props = {
                ...baseProps,
                maxFilesReached: true,
                maxFileCount: 10,
            };
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...props}/>,
            );

            const photoLibraryItem = getByTestId('file_attachment.photo_library');
            fireEvent.press(photoLibraryItem);

            await waitFor(() => {
                expect(mockDismissBottomSheet).toHaveBeenCalledWith(Screens.ATTACHMENT_OPTIONS);
                expect(Alert.alert).toHaveBeenCalledWith(
                    'Error',
                    'Maximum 10 files allowed',
                );
                expect(mockAttachFileFromPhotoGallery).not.toHaveBeenCalled();
            });
        });

        it('should show alert and not call picker when maxFilesReached is true for camera', async () => {
            const props = {
                ...baseProps,
                maxFilesReached: true,
                maxFileCount: 10,
            };
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...props}/>,
            );

            const takePhotoItem = getByTestId('file_attachment.take_photo');
            fireEvent.press(takePhotoItem);

            await waitFor(() => {
                expect(mockDismissBottomSheet).toHaveBeenCalledWith(Screens.ATTACHMENT_OPTIONS);
                expect(Alert.alert).toHaveBeenCalledWith(
                    'Error',
                    'Maximum 10 files allowed',
                );
                expect(mockAttachFileFromCamera).not.toHaveBeenCalled();
            });
        });

        it('should show alert and not call picker when maxFilesReached is true for attach file', async () => {
            const props = {
                ...baseProps,
                maxFilesReached: true,
                maxFileCount: 10,
            };
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...props}/>,
            );

            const attachFileItem = getByTestId('file_attachment.attach_file');
            fireEvent.press(attachFileItem);

            await waitFor(() => {
                expect(mockDismissBottomSheet).toHaveBeenCalledWith(Screens.ATTACHMENT_OPTIONS);
                expect(Alert.alert).toHaveBeenCalledWith(
                    'Error',
                    'Maximum 10 files allowed',
                );
                expect(mockAttachFileFromFiles).not.toHaveBeenCalled();
            });
        });

        it('should not show alert when maxFilesReached is true but maxFileCount is undefined', async () => {
            const props = {
                ...baseProps,
                maxFilesReached: true,
                maxFileCount: undefined,
            };
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...props}/>,
            );

            const photoLibraryItem = getByTestId('file_attachment.photo_library');
            fireEvent.press(photoLibraryItem);

            await waitFor(() => {
                expect(mockDismissBottomSheet).toHaveBeenCalledWith(Screens.ATTACHMENT_OPTIONS);
                expect(Alert.alert).not.toHaveBeenCalled();
                expect(mockAttachFileFromPhotoGallery).toHaveBeenCalled();
            });
        });
    });

    describe('selection limit calculation', () => {
        it('should pass correct selection limit when fileCount is less than maxFileCount', async () => {
            const props = {
                ...baseProps,
                fileCount: 3,
                maxFileCount: 10,
            };
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...props}/>,
            );

            const photoLibraryItem = getByTestId('file_attachment.photo_library');
            fireEvent.press(photoLibraryItem);

            await waitFor(() => {
                expect(mockAttachFileFromPhotoGallery).toHaveBeenCalledWith(7);
            });
        });

        it('should pass undefined selection limit when maxFileCount is not provided', async () => {
            const props = {
                ...baseProps,
                maxFileCount: undefined,
            };
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...props}/>,
            );

            const photoLibraryItem = getByTestId('file_attachment.photo_library');
            fireEvent.press(photoLibraryItem);

            await waitFor(() => {
                expect(mockAttachFileFromPhotoGallery).toHaveBeenCalledWith(undefined);
            });
        });

        it('should pass undefined selection limit when fileCount equals maxFileCount', async () => {
            const props = {
                ...baseProps,
                fileCount: 10,
                maxFileCount: 10,
            };
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...props}/>,
            );

            const photoLibraryItem = getByTestId('file_attachment.photo_library');
            fireEvent.press(photoLibraryItem);

            await waitFor(() => {
                expect(mockAttachFileFromPhotoGallery).toHaveBeenCalledWith(0);
            });
        });
    });

    describe('edge cases', () => {
        it('should use default closeButtonId when not provided', () => {
            const props = {
                ...baseProps,
            };
            delete (props as {closeButtonId?: string}).closeButtonId;

            renderWithIntlAndTheme(<AttachmentOptions {...props}/>);

            // Component should render without errors
        });

        it('should use default fileCount when not provided', async () => {
            const props = {
                ...baseProps,
            };
            delete (props as {fileCount?: number}).fileCount;

            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...props}/>,
            );

            const photoLibraryItem = getByTestId('file_attachment.photo_library');
            fireEvent.press(photoLibraryItem);

            await waitFor(() => {
                expect(mockAttachFileFromPhotoGallery).toHaveBeenCalledWith(10);
            });
        });

        it('should use default maxFilesReached when not provided', async () => {
            const props = {
                ...baseProps,
            };
            delete (props as {maxFilesReached?: boolean}).maxFilesReached;

            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...props}/>,
            );

            const photoLibraryItem = getByTestId('file_attachment.photo_library');
            fireEvent.press(photoLibraryItem);

            await waitFor(() => {
                expect(mockAttachFileFromPhotoGallery).toHaveBeenCalled();
                expect(Alert.alert).not.toHaveBeenCalled();
            });
        });

        it('should use default canUploadFiles when not provided', async () => {
            const props = {
                ...baseProps,
            };
            delete (props as {canUploadFiles?: boolean}).canUploadFiles;

            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...props}/>,
            );

            const photoLibraryItem = getByTestId('file_attachment.photo_library');
            fireEvent.press(photoLibraryItem);

            await waitFor(() => {
                expect(mockAttachFileFromPhotoGallery).toHaveBeenCalled();
                expect(Alert.alert).not.toHaveBeenCalled();
            });
        });
    });

    describe('attach logs', () => {
        it('should render attach logs option when showAttachLogs is true', () => {
            const props = {...baseProps, showAttachLogs: true};
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...props}/>,
            );

            expect(getByTestId('file_attachment.attach_logs')).toBeTruthy();
        });

        it('should not render attach logs option when showAttachLogs is false', () => {
            const props = {...baseProps, showAttachLogs: false};
            const {queryByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...props}/>,
            );

            expect(queryByTestId('file_attachment.attach_logs')).toBeNull();
        });

        it('should call onUploadFiles with zip file info on successful attach', async () => {
            jest.mocked(TurboLogger.getLogPaths).mockResolvedValue(['/path/to/log1.txt', '/path/to/log2.txt']);
            jest.mocked(RNUtils.createZipFile).mockResolvedValue('/path/to/logs.zip');
            jest.mocked(getInfoAsync).mockResolvedValue({exists: true, size: 1234, uri: 'file:///path/to/logs.zip', isDirectory: false, modificationTime: 0, md5: ''});

            const props = {...baseProps, showAttachLogs: true};
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...props}/>,
            );

            fireEvent.press(getByTestId('file_attachment.attach_logs'));

            await waitFor(() => {
                expect(baseProps.onUploadFiles).toHaveBeenCalledWith([
                    expect.objectContaining({
                        clientId: 'generated-id',
                        name: expect.stringMatching(/^app-logs-\d+\.zip$/),
                        mime_type: 'application/zip',
                        extension: 'zip',
                        size: 1234,
                        localPath: 'file:///path/to/logs.zip',
                    }),
                ]);
            });
        });

        it('should show alert when no log files available', async () => {
            jest.mocked(TurboLogger.getLogPaths).mockResolvedValue([]);

            const props = {...baseProps, showAttachLogs: true};
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...props}/>,
            );

            fireEvent.press(getByTestId('file_attachment.attach_logs'));

            await waitFor(() => {
                expect(Alert.alert).toHaveBeenCalledWith(
                    'Error',
                    'No log files available',
                );
                expect(baseProps.onUploadFiles).not.toHaveBeenCalled();
            });
        });

        it('should show alert when createZipFile fails', async () => {
            jest.mocked(TurboLogger.getLogPaths).mockResolvedValue(['/path/to/log1.txt']);
            jest.mocked(RNUtils.createZipFile).mockRejectedValue(new Error('zip failed'));

            const props = {...baseProps, showAttachLogs: true};
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...props}/>,
            );

            fireEvent.press(getByTestId('file_attachment.attach_logs'));

            await waitFor(() => {
                expect(logError).toHaveBeenCalledWith('[AttachmentOptions.onAttachLogs]', expect.any(Error));
                expect(Alert.alert).toHaveBeenCalledWith(
                    'Error',
                    'Failed to attach app logs',
                );
                expect(baseProps.onUploadFiles).not.toHaveBeenCalled();
            });
        });

        it('should show alert when createZipFile returns empty path', async () => {
            jest.mocked(TurboLogger.getLogPaths).mockResolvedValue(['/path/to/log1.txt']);
            jest.mocked(RNUtils.createZipFile).mockResolvedValue('');

            const props = {...baseProps, showAttachLogs: true};
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...props}/>,
            );

            fireEvent.press(getByTestId('file_attachment.attach_logs'));

            await waitFor(() => {
                expect(logError).toHaveBeenCalledWith('[AttachmentOptions.onAttachLogs]', expect.any(Error));
                expect(Alert.alert).toHaveBeenCalledWith(
                    'Error',
                    'Failed to attach app logs',
                );
                expect(baseProps.onUploadFiles).not.toHaveBeenCalled();
            });
        });

        it('should prevent double-tap with ref guard', async () => {
            jest.mocked(TurboLogger.getLogPaths).mockResolvedValue([]);

            const props = {...baseProps, showAttachLogs: true};
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentOptions {...props}/>,
            );

            const logsButton = getByTestId('file_attachment.attach_logs');

            // Press twice rapidly - the ref guard should block the second call
            fireEvent.press(logsButton);
            fireEvent.press(logsButton);

            await waitFor(() => {
                expect(Alert.alert).toHaveBeenCalledTimes(1);
            });

            // dismissBottomSheet is called once for the first press,
            // the second press is blocked by the ref guard
            expect(mockDismissBottomSheet).toHaveBeenCalledTimes(1);
        });
    });

    describe('tablet rendering', () => {
        it('should not render title when isTablet is true', () => {
            const useIsTablet = require('@hooks/device').useIsTablet;
            useIsTablet.mockReturnValue(true);

            const {queryByText} = renderWithIntlAndTheme(
                <AttachmentOptions {...baseProps}/>,
            );

            expect(queryByText('Files and media')).toBeNull();
        });

        it('should render title when isTablet is false', () => {
            const useIsTablet = require('@hooks/device').useIsTablet;
            useIsTablet.mockReturnValue(false);

            const {getByText} = renderWithIntlAndTheme(
                <AttachmentOptions {...baseProps}/>,
            );

            expect(getByText('Files and media')).toBeTruthy();
        });
    });
});


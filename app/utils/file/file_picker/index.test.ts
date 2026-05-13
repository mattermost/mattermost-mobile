// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils from '@mattermost/rnutils';
import {pick, keepLocalCopy, type DocumentPickerResponse} from '@react-native-documents/picker';
import {applicationName} from 'expo-application';
import {Alert, Platform} from 'react-native';
import {launchCamera, launchImageLibrary, type Asset, type ImagePickerResponse} from 'react-native-image-picker';
import Permissions from 'react-native-permissions';

import {dismissBottomSheet} from '@screens/navigation';
import TestHelper from '@test/test_helper';
import {extractFileInfo, lookupMimeType} from '@utils/file';
import {getIntlShape} from '@utils/general';
import {logWarning} from '@utils/log';

import FilePickerUtil from './index';

jest.mock('react-native-image-picker');

jest.mock('@react-native-documents/picker', () => ({
    pick: jest.fn(async () => []),
    keepLocalCopy: jest.fn(async () => []),
}));

jest.mock('@screens/navigation', () => ({
    dismissBottomSheet: jest.fn(),
}));

jest.mock('@utils/file', () => ({
    extractFileInfo: jest.fn(),
    lookupMimeType: jest.fn(),
}));

jest.mock('@utils/log', () => ({
    logWarning: jest.fn(),
}));

jest.mock('@mattermost/rnutils', () => ({
    getRealFilePath: jest.fn(),
    isRunningInSplitView: jest.fn().mockReturnValue({isSplit: false, isTablet: false}),
    getConstants: jest.fn().mockReturnValue({
        appGroupIdentifier: 'group.mattermost.rnbeta',
        appGroupSharedDirectory: {
            sharedDirectory: '',
            databasePath: '',
        },
    }),
}));

describe('FilePickerUtil', () => {
    const mockUploadFiles = jest.fn();
    const intl = getIntlShape();
    const originalSelect = Platform.select;

    let filePickerUtil: FilePickerUtil;

    beforeAll(() => {
        Platform.select = ({android, ios, default: dft}: any) => {
            if (Platform.OS === 'android' && android) {
                return android;
            } else if (Platform.OS === 'ios' && ios) {
                return ios;
            }

            return dft;
        };
    });

    afterAll(() => {
        Platform.select = originalSelect;
    });

    beforeEach(() => {
        Platform.OS = 'ios';
        filePickerUtil = new FilePickerUtil(intl, mockUploadFiles);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('private functions', () => {
        test('should assign intl and uploadFiles correctly in the constructor', () => {
            // @ts-expect-error intl is private
            expect(filePickerUtil.intl).toBe(intl);

            // @ts-expect-error uploadFiles is private
            expect(filePickerUtil.uploadFiles).toBe(mockUploadFiles);
        });

        test('should return correct permission messages for camera', () => {
            const camera = {
                title: `${applicationName} would like to access your camera`,
                text: `Take photos and upload them to your server or save them to your device. Open Settings to grant ${applicationName} read and write access to your camera.`,
            };

            // @ts-expect-error getPermissionMessages is private
            const result = filePickerUtil.getPermissionMessages('camera');
            expect(result).toEqual(camera);
        });

        test('should return correct permission messages for storage', () => {
            const expected = {
                title: `${applicationName} would like to access your files`,
                text: `Upload files to your server. Open Settings to grant ${applicationName} Read and Write access to files on this device.`,
            };

            // @ts-expect-error getPermissionMessages is private
            const result = filePickerUtil.getPermissionMessages('storage');
            expect(result).toEqual(expected);
        });

        test('should return correct permission messages for photo_ios', () => {
            const expected = {
                title: `${applicationName} would like to access your photos`,
                text: `Upload photos and videos to your server or save them to your device. Open Settings to grant ${applicationName} Read and Write access to your photo and video library.`,
            };

            // @ts-expect-error getPermissionMessages is private
            const result = filePickerUtil.getPermissionMessages('photo_ios');
            expect(result).toEqual(expected);
        });

        test('should return correct permission messages for photo_android', () => {
            const expected = {
                title: `${applicationName} would like to access your photos`,
                text: `Upload photos to your server or save them to your device. Open Settings to grant ${applicationName} Read and Write access to your photo library.`,
            };

            // @ts-expect-error getPermissionMessages is private
            const result = filePickerUtil.getPermissionMessages('photo_android');
            expect(result).toEqual(expected);
        });

        test('should prepare file upload correctly', async () => {
            const mockFiles = [{uri: 'file://test'}] as Array<Asset | DocumentPickerResponse>;
            const mockExtractedFiles = [{uri: 'file://test', name: 'test'}];

            (extractFileInfo as jest.Mock).mockResolvedValue(mockExtractedFiles);

            // @ts-expect-error prepareFileUpload is private
            await filePickerUtil.prepareFileUpload(mockFiles);

            expect(extractFileInfo).toHaveBeenCalledWith(mockFiles);
            expect(dismissBottomSheet).toHaveBeenCalled();
            expect(mockUploadFiles).toHaveBeenCalledWith(mockExtractedFiles);
        });

        test('should not upload files if extraction returns an empty array', async () => {
            const mockFiles = [{uri: 'file://test'}] as Array<Asset | DocumentPickerResponse>;

            (extractFileInfo as jest.Mock).mockResolvedValue([]);

            // @ts-expect-error prepareFileUpload is private
            await filePickerUtil.prepareFileUpload(mockFiles);

            expect(extractFileInfo).toHaveBeenCalledWith(mockFiles);
            expect(dismissBottomSheet).not.toHaveBeenCalled();
            expect(mockUploadFiles).not.toHaveBeenCalled();
        });

        test('should return correct permission denied message with source', () => {
            const expected = {
                title: `${applicationName} would like to access your files`,
                text: `Upload files to your server. Open Settings to grant ${applicationName} Read and Write access to files on this device.`,
            };

            // @ts-expect-error getPermissionDeniedMessage is private
            const result = filePickerUtil.getPermissionDeniedMessage('storage');
            expect(result).toEqual(expected);
        });

        test('should return correct permission denied message without source', () => {
            Platform.OS = 'android';
            const expected = {
                title: `${applicationName} would like to access your photos`,
                text: `Upload photos to your server or save them to your device. Open Settings to grant ${applicationName} Read and Write access to your photo library.`,
            };

            // @ts-expect-error getPermissionDeniedMessage is private
            const result = filePickerUtil.getPermissionDeniedMessage();
            expect(result).toEqual(expected);
        });

        test('should return files from response correctly on iOS', async () => {
            const mockResponse = {
                assets: [{uri: 'file://test', type: 'image/jpeg'}],
            } as ImagePickerResponse;

            // @ts-expect-error getFilesFromResponse is private
            const result = await filePickerUtil.getFilesFromResponse(mockResponse);

            expect(result).toEqual(mockResponse.assets);
            expect(logWarning).not.toHaveBeenCalled();
        });

        test('should return files from response correctly on Android', async () => {
            Platform.OS = 'android';
            const mockResponse = {
                assets: [{uri: 'file://test', type: 'image/jpeg', fileName: 'test.jpg'}],
            } as ImagePickerResponse;

            (RNUtils.getRealFilePath as jest.Mock).mockResolvedValue('file://real_path');
            (lookupMimeType as jest.Mock).mockReturnValue('image/jpeg');

            // @ts-expect-error getFilesFromResponse is private
            const result = await filePickerUtil.getFilesFromResponse(mockResponse);

            expect(result).toEqual([{...mockResponse.assets![0], uri: 'file://real_path'}]);
            expect(RNUtils.getRealFilePath).toHaveBeenCalledWith('file://test');
        });

        test('should log warning if no assets in response', async () => {
            const mockResponse = {} as ImagePickerResponse;

            // @ts-expect-error getFilesFromResponse is private
            const result = await filePickerUtil.getFilesFromResponse(mockResponse);

            expect(result).toEqual([]);
            expect(logWarning).toHaveBeenCalledWith('no assets in response');
        });

        test('should log warning if attaching file returns empty uri on Android', async () => {
            Platform.OS = 'android';
            const mockResponse = {
                assets: [{uri: 'file://test', type: 'image/jpeg', fileName: 'test.jpg'}],
            } as ImagePickerResponse;

            (RNUtils.getRealFilePath as jest.Mock).mockResolvedValue('');

            // @ts-expect-error getFilesFromResponse is private
            const result = await filePickerUtil.getFilesFromResponse(mockResponse);

            expect(result).toEqual([]);
            expect(logWarning).toHaveBeenCalledWith('attaching file reponse return empty uri', mockResponse.assets![0]);
        });

        test('should check and request photo permission correctly', async () => {
            Platform.OS = 'ios';
            const source = 'camera';
            (Permissions.check as jest.Mock).mockResolvedValue(Permissions.RESULTS.DENIED);
            (Permissions.request as jest.Mock).mockResolvedValue(Permissions.RESULTS.GRANTED);

            // @ts-expect-error hasPhotoPermission is private
            const result = await filePickerUtil.hasPhotoPermission(source);

            expect(Permissions.check).toHaveBeenCalledWith(Permissions.PERMISSIONS.IOS.CAMERA);
            expect(Permissions.request).toHaveBeenCalledWith(Permissions.PERMISSIONS.IOS.CAMERA);
            expect(result).toBe(true);
        });

        test('should handle blocked photo permission correctly on iOS', async () => {
            const source = 'camera';
            (Permissions.check as jest.Mock).mockResolvedValue(Permissions.RESULTS.BLOCKED);

            const alertSpy = jest.spyOn(Alert, 'alert');

            // @ts-expect-error hasPhotoPermission is private
            const result = await filePickerUtil.hasPhotoPermission(source);

            expect(Permissions.check).toHaveBeenCalledWith(Permissions.PERMISSIONS.IOS.CAMERA);
            expect(alertSpy).toHaveBeenCalled();
            expect(result).toBe(false);
        });

        test('should check and request storage permission correctly on Android', async () => {
            Platform.OS = 'android';
            Platform.Version = 31;
            const storagePermission = Permissions.PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
            (Permissions.check as jest.Mock).mockResolvedValue(Permissions.RESULTS.DENIED);
            (Permissions.request as jest.Mock).mockResolvedValue(Permissions.RESULTS.GRANTED);

            // @ts-expect-error hasStoragePermission is private
            const result = await filePickerUtil.hasStoragePermission();

            expect(Permissions.check).toHaveBeenCalledWith(storagePermission);
            expect(Permissions.request).toHaveBeenCalledWith(storagePermission);
            expect(result).toBe(true);
        });

        test('should handle blocked storage permission correctly on Android', async () => {
            Platform.OS = 'android';
            Platform.Version = 31;
            const storagePermission = Permissions.PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
            (Permissions.check as jest.Mock).mockResolvedValue(Permissions.RESULTS.BLOCKED);

            const alertSpy = jest.spyOn(Alert, 'alert');

            // @ts-expect-error hasStoragePermission is private
            const result = await filePickerUtil.hasStoragePermission();

            expect(Permissions.check).toHaveBeenCalledWith(storagePermission);
            expect(alertSpy).toHaveBeenCalled();
            expect(result).toBe(false);
        });

        test('should check and request write storage permission correctly on Android', async () => {
            Platform.OS = 'android';
            Platform.Version = 28;
            const storagePermission = Permissions.PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE;
            (Permissions.check as jest.Mock).mockResolvedValue(Permissions.RESULTS.DENIED);
            (Permissions.request as jest.Mock).mockResolvedValue(Permissions.RESULTS.GRANTED);

            // @ts-expect-error hasWriteStoragePermission is private
            const result = await filePickerUtil.hasWriteStoragePermission();

            expect(Permissions.check).toHaveBeenCalledWith(storagePermission);
            expect(Permissions.request).toHaveBeenCalledWith(storagePermission);
            expect(result).toBe(true);
        });

        test('should handle blocked write storage permission correctly on Android', async () => {
            Platform.OS = 'android';
            Platform.Version = 28;
            const storagePermission = Permissions.PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE;
            (Permissions.check as jest.Mock).mockResolvedValue(Permissions.RESULTS.BLOCKED);

            const alertSpy = jest.spyOn(Alert, 'alert');

            // @ts-expect-error hasWriteStoragePermission is private
            const result = await filePickerUtil.hasWriteStoragePermission();

            expect(Permissions.check).toHaveBeenCalledWith(storagePermission);
            expect(alertSpy).toHaveBeenCalled();
            expect(result).toBe(false);
        });

    });

    describe('attachFileFromCamera', () => {

        test('should not launch camera if permission is denied', async () => {
            (Permissions.check as jest.Mock).mockResolvedValue(Permissions.RESULTS.DENIED);
            (Permissions.request as jest.Mock).mockResolvedValue(Permissions.RESULTS.DENIED);

            const launchCameraMock = launchCamera as jest.Mock;

            await filePickerUtil.attachFileFromCamera();

            expect(Permissions.check).toHaveBeenCalledWith(expect.any(String));
            expect(launchCameraMock).not.toHaveBeenCalled();
        });

        test('should launch camera if permission is granted', async () => {
            (Permissions.check as jest.Mock).mockResolvedValue(Permissions.RESULTS.GRANTED);

            const launchCameraMock = launchCamera as jest.Mock;
            launchCameraMock.mockImplementation((options, callback) => {
                callback({assets: [{uri: 'file://camera_photo.jpg', type: 'image/jpeg', fileName: 'photo.jpg'}]});
            });

            const mockExtractedFiles = [{fileName: 'photo.jpg', type: 'image/jpeg', uri: 'file://real_camera_photo.jpg'}];

            (extractFileInfo as jest.Mock).mockResolvedValue(mockExtractedFiles);

            await filePickerUtil.attachFileFromCamera();

            expect(launchCameraMock).toHaveBeenCalled();
            await TestHelper.wait(100);
            expect(mockUploadFiles).toHaveBeenCalledWith([{
                uri: 'file://real_camera_photo.jpg',
                type: 'image/jpeg',
                fileName: 'photo.jpg',
            }]);
        });

        test('should handle cancelled camera response', async () => {
            (Permissions.check as jest.Mock).mockResolvedValue(Permissions.RESULTS.GRANTED);

            const launchCameraMock = launchCamera as jest.Mock;
            launchCameraMock.mockImplementation((options, callback) => {
                callback({didCancel: true});
            });

            await filePickerUtil.attachFileFromCamera();

            expect(launchCameraMock).toHaveBeenCalled();
            expect(mockUploadFiles).not.toHaveBeenCalled();
        });

        test('should handle camera error response', async () => {
            (Permissions.check as jest.Mock).mockResolvedValue(Permissions.RESULTS.GRANTED);

            const launchCameraMock = launchCamera as jest.Mock;
            launchCameraMock.mockImplementation((options, callback) => {
                callback({errorCode: 'camera_unavailable'});
            });

            await filePickerUtil.attachFileFromCamera();

            expect(launchCameraMock).toHaveBeenCalled();
            expect(mockUploadFiles).not.toHaveBeenCalled();
        });

        test('should request write storage permission for Android API <= 28', async () => {
            Platform.OS = 'android';
            Platform.Version = 28;

            (Permissions.check as jest.Mock).mockImplementation((permission) => {
                if (permission === Permissions.PERMISSIONS.ANDROID.CAMERA) {
                    return Permissions.RESULTS.GRANTED;
                }
                return Permissions.RESULTS.DENIED;
            });

            (Permissions.request as jest.Mock).mockResolvedValue(Permissions.RESULTS.GRANTED);

            const mockExtractedFiles = [{fileName: 'photo.jpg', type: 'image/jpeg', uri: 'file://real_camera_photo.jpg'}];

            (extractFileInfo as jest.Mock).mockResolvedValue(mockExtractedFiles);

            const launchCameraMock = launchCamera as jest.Mock;
            launchCameraMock.mockImplementation((options, callback) => {
                callback({assets: [{uri: 'file://camera_photo.jpg', type: 'image/jpeg', fileName: 'photo.jpg'}]});
            });

            await filePickerUtil.attachFileFromCamera();

            expect(Permissions.check).toHaveBeenCalledWith(Permissions.PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
            expect(launchCameraMock).toHaveBeenCalled();
            await TestHelper.wait(100);
            expect(mockUploadFiles).toHaveBeenCalledWith([{
                uri: 'file://real_camera_photo.jpg',
                type: 'image/jpeg',
                fileName: 'photo.jpg',
            }]);
        });

        test('should not launch camera if write storage permission is denied on Android API <= 28', async () => {
            Platform.OS = 'android';
            Platform.Version = 28;

            (Permissions.check as jest.Mock).mockImplementation((permission) => {
                if (permission === Permissions.PERMISSIONS.ANDROID.CAMERA) {
                    return Permissions.RESULTS.GRANTED;
                }
                return Permissions.RESULTS.DENIED;
            });

            (Permissions.request as jest.Mock).mockResolvedValue(Permissions.RESULTS.DENIED);

            const launchCameraMock = launchCamera as jest.Mock;

            await filePickerUtil.attachFileFromCamera();

            expect(Permissions.check).toHaveBeenCalledWith(Permissions.PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
            expect(launchCameraMock).not.toHaveBeenCalled();
        });
    });

    describe('attachFileFromFiles', () => {
        test('should not pick files if permission is denied', async () => {
            Platform.OS = 'android';
            (Permissions.check as jest.Mock).mockResolvedValue(Permissions.RESULTS.DENIED);
            (Permissions.request as jest.Mock).mockResolvedValue(Permissions.RESULTS.DENIED);

            const result = await filePickerUtil.attachFileFromFiles();

            expect(pick).not.toHaveBeenCalled();
            expect(result).toEqual({error: 'no permission'});
        });

        test('should pick files if permission is granted', async () => {
            (Permissions.check as jest.Mock).mockResolvedValue(Permissions.RESULTS.GRANTED);

            const docResponse = [
                {
                    uri: 'file://document.pdf',
                    name: 'document',
                    type: 'pdf',
                    size: 10,
                } as DocumentPickerResponse,
            ];

            (pick as jest.Mock).mockResolvedValue(docResponse);

            const mockExtractedFiles = [{uri: 'file://real_document.pdf'}];

            (extractFileInfo as jest.Mock).mockResolvedValue(mockExtractedFiles);

            const result = await filePickerUtil.attachFileFromFiles();

            expect(pick).toHaveBeenCalledWith({
                allowMultiSelection: false,
                type: ['public.item'],
            });

            await TestHelper.wait(100);
            expect(mockUploadFiles).toHaveBeenCalledWith([
                {uri: 'file://real_document.pdf'},
            ]);

            expect(result).toEqual({error: undefined});
        });

        test('should return error on DocumentPicker failure', async () => {
            (Permissions.check as jest.Mock).mockResolvedValue(Permissions.RESULTS.GRANTED);
            const pickerError = new Error('Picker failed');

            (pick as jest.Mock).mockRejectedValue(pickerError);

            const result = await filePickerUtil.attachFileFromFiles();

            expect(pick).toHaveBeenCalled();
            expect(result).toEqual({error: pickerError});
        });

        test('should allow multi-selection when specified', async () => {
            (Permissions.check as jest.Mock).mockResolvedValue(Permissions.RESULTS.GRANTED);

            const mockExtractedFiles = [
                {uri: 'file://real_document1.pdf'},
                {uri: 'file://real_document2.pdf'},
            ];

            (extractFileInfo as jest.Mock).mockResolvedValue(mockExtractedFiles);

            const docResponse = [
                {uri: 'file://document1.pdf'},
                {uri: 'file://document2.pdf'},
            ];

            (pick as jest.Mock).mockResolvedValue(docResponse);
            (keepLocalCopy as jest.Mock).mockResolvedValue([
                {status: 'success', sourceUri: 'file://document1.pdf', localUri: 'file://local_document1.pdf'},
                {status: 'success', sourceUri: 'file://document2.pdf', localUri: 'file://local_document2.pdf'},
            ]);

            const result = await filePickerUtil.attachFileFromFiles(undefined, true);

            expect(pick).toHaveBeenCalledWith({
                allowMultiSelection: true,
                type: ['public.item'],
            });
            expect(keepLocalCopy).toHaveBeenCalledWith(expect.objectContaining({destination: 'cachesDirectory'}));

            expect(mockUploadFiles).toHaveBeenCalledWith(mockExtractedFiles);

            expect(result).toEqual({error: undefined});
        });

        test('should use specified file type', async () => {
            (Permissions.check as jest.Mock).mockResolvedValue(Permissions.RESULTS.GRANTED);

            const mockExtractedFiles = [{uri: 'file://real_image.jpg'}];

            (extractFileInfo as jest.Mock).mockResolvedValue(mockExtractedFiles);

            const docResponse = [{uri: 'file://image.jpg'}];

            (pick as jest.Mock).mockResolvedValue(docResponse);
            (keepLocalCopy as jest.Mock).mockResolvedValue([
                {status: 'success', sourceUri: 'file://image.jpg', localUri: 'file://local_image.jpg'},
            ]);

            const result = await filePickerUtil.attachFileFromFiles('image/*');

            expect(pick).toHaveBeenCalledWith({
                allowMultiSelection: false,
                type: ['image/*'],
            });
            expect(keepLocalCopy).toHaveBeenCalledWith(expect.objectContaining({destination: 'cachesDirectory'}));

            expect(mockUploadFiles).toHaveBeenCalledWith(mockExtractedFiles);

            expect(result).toEqual({error: undefined});
        });

        test('should default to Android file type if specified', async () => {
            Platform.OS = 'android';
            (Permissions.check as jest.Mock).mockResolvedValue(Permissions.RESULTS.GRANTED);

            const docResponse = [{uri: 'file://document.pdf'}];

            const mockExtractedFiles = [{uri: 'file://real_document.pdf'}];

            (extractFileInfo as jest.Mock).mockResolvedValue(mockExtractedFiles);

            (pick as jest.Mock).mockResolvedValue(docResponse);
            (keepLocalCopy as jest.Mock).mockResolvedValue([
                {status: 'success', sourceUri: 'file://document.pdf', localUri: 'file://local_document.pdf'},
            ]);

            const result = await filePickerUtil.attachFileFromFiles();

            expect(pick).toHaveBeenCalledWith({
                allowMultiSelection: false,
                type: ['*/*'],
            });
            expect(keepLocalCopy).toHaveBeenCalledWith(expect.objectContaining({destination: 'cachesDirectory'}));

            expect(mockUploadFiles).toHaveBeenCalledWith(mockExtractedFiles);

            expect(result).toEqual({error: undefined});
        });
    });

    describe('attachFileFromPhotoGallery', () => {
        test('should not open the image library if permission is denied', async () => {
            (Permissions.check as jest.Mock).mockResolvedValue(Permissions.RESULTS.DENIED);
            (Permissions.request as jest.Mock).mockResolvedValue(Permissions.RESULTS.DENIED);

            await filePickerUtil.attachFileFromPhotoGallery();

            expect(launchImageLibrary).not.toHaveBeenCalled();
        });

        test('should open the image library if permission is granted', async () => {
            (Permissions.check as jest.Mock).mockResolvedValue(Permissions.RESULTS.GRANTED);

            const response: ImagePickerResponse = {
                assets: [{uri: 'file://image1.jpg'}],
            };

            (launchImageLibrary as jest.Mock).mockImplementation((options, callback) => callback(response));

            const mockExtractedFiles = [{uri: 'file://real_image1.jpg'}];

            (extractFileInfo as jest.Mock).mockResolvedValue(mockExtractedFiles);

            await filePickerUtil.attachFileFromPhotoGallery();

            expect(launchImageLibrary).toHaveBeenCalledWith({
                quality: 1,
                mediaType: 'mixed',
                includeBase64: false,
                selectionLimit: 1,
            }, expect.any(Function));

            await TestHelper.wait(100);
            expect(mockUploadFiles).toHaveBeenCalledWith([
                {uri: 'file://real_image1.jpg'},
            ]);
        });

        test('should handle error or cancellation in image library response', async () => {
            (Permissions.check as jest.Mock).mockResolvedValue(Permissions.RESULTS.GRANTED);

            const response: ImagePickerResponse = {
                errorMessage: 'An error occurred',
                didCancel: false,
            };

            (launchImageLibrary as jest.Mock).mockImplementation((options, callback) => callback(response));

            await filePickerUtil.attachFileFromPhotoGallery();

            expect(logWarning).toHaveBeenCalledWith('Attach failed', 'An error occurred');

            const cancelledResponse: ImagePickerResponse = {
                errorMessage: '',
                didCancel: true,
            };

            (launchImageLibrary as jest.Mock).mockImplementation((options, callback) => callback(cancelledResponse));

            await filePickerUtil.attachFileFromPhotoGallery();

            expect(logWarning).toHaveBeenCalledWith('Attach failed', 'cancelled');
        });

        test('should handle selection limit parameter', async () => {
            (Permissions.check as jest.Mock).mockResolvedValue(Permissions.RESULTS.GRANTED);

            const response: ImagePickerResponse = {
                assets: [{uri: 'file://image1.jpg'}, {uri: 'file://image2.jpg'}],
            };

            (launchImageLibrary as jest.Mock).mockImplementation((options, callback) => callback(response));
            const mockExtractedFiles = [{uri: 'file://real_image1.jpg'}, {uri: 'file://real_image2.jpg'}];

            (extractFileInfo as jest.Mock).mockResolvedValue(mockExtractedFiles);

            await filePickerUtil.attachFileFromPhotoGallery(2);

            expect(launchImageLibrary).toHaveBeenCalledWith({
                quality: 1,
                mediaType: 'mixed',
                includeBase64: false,
                selectionLimit: 2,
            }, expect.any(Function));
        });
    });
});

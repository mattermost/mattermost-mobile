// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getInfoAsync, deleteAsync} from 'expo-file-system';
import {createIntl} from 'react-intl';
import {Platform} from 'react-native';
import Permissions from 'react-native-permissions';

import {getTranslations} from '@i18n';
import {logError} from '@utils/log';
import {urlSafeBase64Encode} from '@utils/security';

import {deleteFileCache, deleteFileCacheByDir, deleteV1Data, extractFileInfo, fileExists, fileMaxWarning, fileSizeWarning, filterFileExtensions, getAllFilesInCachesDirectory, getAllowedServerMaxFileSize, getExtensionFromContentDisposition, getExtensionFromMime, getFileType, getFormattedFileSize, getLocalFilePathFromFile, hasWriteStoragePermission, isDocument, isGif, isImage, isVideo, lookupMimeType, uploadDisabledWarning} from '.';

jest.mock('expo-file-system');
jest.mock('react-native', () => {
    const RN = jest.requireActual('react-native');
    return {
        Platform: {
            ...RN.Platform,
            OS: 'ios',
        },
        Alert: {alert: jest.fn()},
        Linking: {openSettings: jest.fn()},
        NativeModules: {
            ...RN.NativeModules,
            RNUtils: {
                getConstants: () => ({
                    appGroupIdentifier: 'group.mattermost.rnbeta',
                    appGroupSharedDirectory: {
                        sharedDirectory: '',
                        databasePath: '',
                    },
                }),
                addListener: jest.fn(),
                removeListeners: jest.fn(),
                isRunningInSplitView: jest.fn().mockReturnValue({isSplit: false, isTablet: false}),

                getDeliveredNotifications: jest.fn().mockResolvedValue([]),
                removeChannelNotifications: jest.fn().mockImplementation(),
                removeThreadNotifications: jest.fn().mockImplementation(),
                removeServerNotifications: jest.fn().mockImplementation(),
            },
        },
    };
});
jest.mock('react-native-permissions', () => ({
    check: jest.fn(),
    request: jest.fn(),
    RESULTS: {
        GRANTED: 'granted',
        DENIED: 'denied',
        BLOCKED: 'blocked',
    },
    PERMISSIONS: {ANDROID: {WRITE_EXTERNAL_STORAGE: 'WRITE_EXTERNAL_STORAGE'}},
}));
jest.mock('@utils/log', () => ({logError: jest.fn()}));
jest.mock('@utils/mattermost_managed', () => ({
    getIOSAppGroupDetails: () => ({appGroupSharedDirectory: 'appGroupSharedDirectory'}),
    deleteEntitiesFile: jest.fn(),
}));
jest.mock('@utils/security', () => ({urlSafeBase64Encode: (url: string) => btoa(url)}));

describe('Image utils', () => {
    const intl = createIntl({locale: 'en', messages: getTranslations('en')});
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('filterFileExtensions', () => {
        it('should return correct filter for each type', () => {
            expect(filterFileExtensions('ALL')).toBe('');
            expect(filterFileExtensions('AUDIO')).toEqual(['mp3', 'wav', 'wma', 'm4a', 'flac', 'aac', 'ogg'].map((e) => `ext:${e}`).join(' '));
            expect(filterFileExtensions('CODE')).toEqual([
                'as', 'applescript', 'osascript', 'scpt', 'bash', 'sh', 'zsh', 'clj', 'boot', 'cl2', 'cljc', 'cljs',
                'cljs.hl', 'cljscm', 'cljx', 'hic', 'coffee', '_coffee', 'cake', 'cjsx', 'cson', 'iced', 'cpp', 'c', 'cc', 'h', 'c++',
                'h++', 'hpp', 'cs', 'csharp', 'css', 'd', 'di', 'dart', 'delphi', 'dpr', 'dfm', 'pas', 'pascal', 'freepascal', 'lazarus',
                'lpr', 'lfm', 'diff', 'django', 'jinja', 'dockerfile', 'docker', 'erl', 'f90', 'f95', 'fsharp', 'fs', 'gcode', 'nc', 'go',
                'groovy', 'handlebars', 'hbs', 'html.hbs', 'html.handlebars', 'hs', 'hx', 'java', 'jsp', 'js', 'jsx', 'json', 'jl', 'kt',
                'ktm', 'kts', 'less', 'lisp', 'lua', 'mk', 'mak', 'md', 'mkdown', 'mkd', 'matlab', 'm', 'mm', 'objc', 'obj-c', 'ml', 'perl',
                'pl', 'php', 'php3', 'php4', 'php5', 'php6', 'ps', 'ps1', 'pp', 'py', 'gyp', 'r', 'ruby', 'rb', 'gemspec', 'podspec', 'thor',
                'irb', 'rs', 'scala', 'scm', 'sld', 'scss', 'st', 'sql', 'swift', 'ts', 'tex', 'vbnet', 'vb', 'bas', 'vbs', 'v', 'veo', 'xml',
                'html', 'xhtml', 'rss', 'atom', 'xsl', 'plist', 'yaml'].map((e) => `ext:${e}`).join(' '));
            expect(filterFileExtensions('DOCUMENTS')).toEqual(['doc', 'docx', 'odt', 'pdf', 'txt', 'rtf'].map((e) => `ext:${e}`).join(' '));
            expect(filterFileExtensions('IMAGES')).toEqual(['jpg', 'gif', 'bmp', 'png', 'jpeg', 'tiff', 'tif', 'svg', 'psd', 'xcf'].map((e) => `ext:${e}`).join(' '));
            expect(filterFileExtensions('PRESENTATIONS')).toEqual(['ppt', 'pptx', 'odp'].map((e) => `ext:${e}`).join(' '));
            expect(filterFileExtensions('SPREADSHEETS')).toEqual(['xls', 'xlsx', 'csv', 'ods'].map((e) => `ext:${e}`).join(' '));
            expect(filterFileExtensions('VIDEOS')).toEqual(['mp4', 'avi', 'webm', 'mkv', 'wmv', 'mpg', 'mov', 'flv', 'ogm', 'mpeg'].map((e) => `ext:${e}`).join(' '));
            expect(filterFileExtensions()).toBe('');
        });
    });

    describe('deleteV1Data', () => {
        it('should delete V1 data', async () => {
            await deleteV1Data();
            expect(deleteAsync).toHaveBeenCalled();
            Platform.OS = 'android';
            await deleteV1Data();
            expect(deleteAsync).toHaveBeenCalled();
            Platform.OS = 'ios';
        });
    });

    describe('deleteFileCache', () => {
        it('should delete file cache', async () => {
            await deleteFileCache('http://server.com');
            expect(deleteAsync).toHaveBeenCalled();
        });
    });

    describe('deleteFileCacheByDir', () => {
        it('should delete file cache by dir', async () => {
            await deleteFileCacheByDir('someDir');
            expect(deleteAsync).toHaveBeenCalled();
        });
    });

    describe('lookupMimeType', () => {
        it('should return correct mime type', () => {
            expect(lookupMimeType('file.txt')).toBe('text/plain');
            expect(lookupMimeType('file.jpg')).toBe('image/jpeg');
            expect(lookupMimeType('file.era')).toBe('application/octet-stream');
        });
    });

    describe('getExtensionFromMime', () => {
        it('should return correct extension from mime type', () => {
            expect(getExtensionFromMime('application/json')).toBe('json');
            expect(getExtensionFromMime('image/png')).toBe('png');
            expect(getExtensionFromMime('video/mp4')).toBe('mp4');
        });
    });

    describe('getExtensionFromContentDisposition', () => {
        it('should return correct extension from content disposition', () => {
            expect(getExtensionFromContentDisposition('inline;filename="file.txt";')).toBe('txt');
            expect(getExtensionFromContentDisposition('inline;filename="file.jpg";')).toBe('jpg');
            expect(getExtensionFromContentDisposition('inline;')).toBe(null);
        });
    });

    describe('getAllowedServerMaxFileSize', () => {
        it('should return correct max file size', () => {
            expect(getAllowedServerMaxFileSize({MaxFileSize: '10485760'} as ClientConfig)).toBe(10485760);
            expect(getAllowedServerMaxFileSize({MaxFileSize: '10485a60'} as ClientConfig)).toBe(10485);
            expect(getAllowedServerMaxFileSize({MaxFileSize: ''} as ClientConfig)).toBe(50 * 1024 * 1024);
        });
    });

    describe('isGif', () => {
        it('should correctly identify gif files', () => {
            expect(isGif({name: 'file.gif', mimeType: 'image/gif'} as unknown as FileInfo)).toBe(true);
            expect(isGif({name: 'file.png', mimeType: 'image/gif'} as unknown as FileInfo)).toBe(true);
            expect(isGif({name: 'file.png', mimeType: 'image/png'} as unknown as FileInfo)).toBe(false);
            expect(isGif()).toBe(false);
        });
    });

    describe('isImage', () => {
        it('should correctly identify image files', () => {
            expect(isImage({name: 'file.png', mimeType: 'image/png'} as unknown as FileInfo)).toBe(true);
            expect(isImage({name: 'file.jpg', mimeType: 'image/jpeg'} as unknown as FileInfo)).toBe(true);
            expect(isImage({name: 'file.png', mimeType: 'text/plain'} as unknown as FileInfo)).toBe(false);
            expect(isImage({name: 'file.png', extension: '.png'} as unknown as FileInfo)).toBe(true);
        });
    });

    describe('isDocument', () => {
        it('should correctly identify document files', () => {
            expect(isDocument({name: 'file.pdf', mimeType: 'application/pdf'} as unknown as FileInfo)).toBe(true);
            expect(isDocument({name: 'file.doc', mimeType: 'application/vnd.apple.pages'} as unknown as FileInfo)).toBe(true);
            expect(isDocument({name: 'file.mp4', mimeType: 'video/mp4'} as unknown as FileInfo)).toBe(false);
            expect(isDocument({name: 'file.doc', mimeType: 'application/msword'} as unknown as FileInfo)).toBe(true);
        });
    });

    describe('isVideo', () => {
        it('should correctly identify video files', () => {
            expect(isVideo({name: 'file.mp4', mimeType: 'video/mp4'} as unknown as FileInfo)).toBe(true);
            expect(isVideo({name: 'file.mov', mimeType: 'video/quicktime'} as unknown as FileInfo)).toBe(true);
            expect(isVideo({name: 'file.mkv', mimeType: 'video/x-matroska'} as unknown as FileInfo)).toBe(false);
        });
    });

    describe('getFormattedFileSize', () => {
        it('should return correct formatted file size', () => {
            expect(getFormattedFileSize(102)).toBe('102 B');
            expect(getFormattedFileSize(1024)).toBe('1024 B');
            expect(getFormattedFileSize(1025)).toBe('1 KB');
            expect(getFormattedFileSize(10 * 1024 * 1024)).toBe('10 MB');
            expect(getFormattedFileSize(10 * 1024 * 1024 * 1024)).toBe('10 GB');
            expect(getFormattedFileSize(10 * 1024 * 1024 * 1024 * 1024)).toBe('10 TB');
        });
    });

    describe('getFileType', () => {
        it('should return correct file type', () => {
            expect(getFileType({extension: 'png'} as unknown as FileInfo)).toBe('image');
            expect(getFileType({extension: 'mp4'} as unknown as FileInfo)).toBe('video');
            expect(getFileType({extension: 'pdf'} as unknown as FileInfo)).toBe('pdf');
            expect(getFileType({extension: 'arr'} as unknown as FileInfo)).toBe('other');
            expect(getFileType({} as unknown as FileInfo)).toBe('other');
        });
    });

    describe('getLocalFilePathFromFile', () => {
        it('should return correct local file path from file', () => {
            expect(getLocalFilePathFromFile('http://server.com', {id: 'someid', name: 'image.png', extension: 'png'} as unknown as FileInfo)).toBe(`file://test-cache-directory/${urlSafeBase64Encode('http://server.com')}/image-someid.png`);
            expect(getLocalFilePathFromFile('http://server.com', {id: 'someid', name: 'image.png'} as unknown as FileInfo)).toBe(`file://test-cache-directory/${urlSafeBase64Encode('http://server.com')}/image-someid.png`);
            expect(getLocalFilePathFromFile('http://server.com', {id: 'someid', extension: 'png'} as unknown as FileInfo)).toBe(`file://test-cache-directory/${urlSafeBase64Encode('http://server.com')}/someid.png`);
            expect(getLocalFilePathFromFile('http://server.com', {id: 'someid'} as unknown as FileInfo)).toBe(`file://test-cache-directory/${urlSafeBase64Encode('http://server.com')}/someid`);
            expect(() => getLocalFilePathFromFile('http://server.com', {extension: 'png'} as unknown as FileInfo)).toThrow('File path could not be set');
        });
    });

    describe('extractFileInfo', () => {
        it('should extract file info correctly', async () => {
            const files = [{uri: 'file://somefile', fileSize: 12345, fileName: 'file.png', type: 'image/png'}];
            let result = await extractFileInfo([]);
            expect(result).toEqual([]);
            result = await extractFileInfo([{fileName: 'file.png'}]);
            expect(result).toEqual([]);
            expect(logError).toHaveBeenCalled();
            result = await extractFileInfo(files);
            expect(result).toEqual(expect.any(Array));
            result = await extractFileInfo([{uri: 'file://somefile', size: 12345, fileName: 'file.png', type: 'image/png'}]);
            expect(result).toEqual(expect.any(Array));
        });
    });

    describe('fileSizeWarning', () => {
        it('should return correct file size warning', () => {
            const msg = fileSizeWarning(intl, 10485760);
            expect(msg).toBe('Files must be less than 10 MB');
        });
    });

    describe('fileMaxWarning', () => {
        it('should return correct file max warning', () => {
            const msg = fileMaxWarning(intl, 10);
            expect(msg).toBe('Uploads limited to 10 files maximum.');
        });
    });

    describe('uploadDisabledWarning', () => {
        it('should return correct upload disabled warning', () => {
            const msg = uploadDisabledWarning(intl);
            expect(msg).toBe('File uploads from mobile are disabled.');
        });
    });

    describe('fileExists', () => {
        it('should check if file exists', async () => {
            // @ts-expect-error type def
            getInfoAsync.mockResolvedValue({exists: true});
            const exists = await fileExists('somePath');
            expect(exists).toBe(true);
        });
    });

    describe('hasWriteStoragePermission', () => {
        it('should check write storage permission', async () => {
            // @ts-expect-error type def
            Permissions.check.mockResolvedValue(Permissions.RESULTS.GRANTED);
            const result = await hasWriteStoragePermission(intl);
            expect(result).toBe(true);
        });
    });

    describe('getAllFilesInCachesDirectory', () => {
        it('should get all files in caches directory', async () => {
            const result = await getAllFilesInCachesDirectory('http://server.com');
            expect(result.files).toEqual(expect.any(Array));
        });
    });
});


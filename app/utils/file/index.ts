// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model from '@nozbe/watermelondb/Model';
import mimeDB from 'mime-db';
import {Alert, Linking, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import FileSystem from 'react-native-fs';
import Permissions, {PERMISSIONS} from 'react-native-permissions';

import {Files} from '@constants';
import {generateId} from '@utils/general';
import keyMirror from '@utils/key_mirror';
import {logError} from '@utils/log';
import {deleteEntititesFile, getIOSAppGroupDetails} from '@utils/mattermost_managed';
import {urlSafeBase64Encode} from '@utils/security';

import type {PastedFile} from '@mattermost/react-native-paste-input';
import type FileModel from '@typings/database/models/servers/file';
import type {IntlShape} from 'react-intl';
import type {DocumentPickerResponse} from 'react-native-document-picker';
import type {Asset} from 'react-native-image-picker';

const EXTRACT_TYPE_REGEXP = /^\s*([^;\s]*)(?:;|\s|$)/;
const CONTENT_DISPOSITION_REGEXP = /inline;filename=".*\.([a-z]+)";/i;
const DEFAULT_SERVER_MAX_FILE_SIZE = 50 * 1024 * 1024;// 50 Mb

export const FileFilters = keyMirror({
    ALL: null,
    DOCUMENTS: null,
    SPREADSHEETS: null,
    PRESENTATIONS: null,
    CODE: null,
    IMAGES: null,
    AUDIO: null,
    VIDEOS: null,
});
export type FileFilter = keyof typeof FileFilters

export const GENERAL_SUPPORTED_DOCS_FORMAT = [
    'application/json',
    'application/msword',
    'application/pdf',
    'application/rtf',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/x-x509-ca-cert',
    'application/xml',
    'text/csv',
    'text/plain',
];

const SUPPORTED_DOCS_FORMAT = Platform.select({
    android: GENERAL_SUPPORTED_DOCS_FORMAT,
    ios: [
        ...GENERAL_SUPPORTED_DOCS_FORMAT,
        'application/vnd.apple.pages',
        'application/vnd.apple.numbers',
        'application/vnd.apple.keynote',
    ],
});

const SUPPORTED_VIDEO_FORMAT = Platform.select({
    ios: ['video/mp4', 'video/x-m4v', 'video/quicktime'],
    android: ['video/3gpp', 'video/x-matroska', 'video/mp4', 'video/webm', 'video/quicktime'],
});

const types: Record<string, string> = {};
const extensions: Record<string, readonly string[]> = {};

export function filterFileExtensions(filter?: FileFilter): string {
    let searchTerms: string[] = [];
    switch (filter) {
        case FileFilters.ALL:
            return '';
        case FileFilters.DOCUMENTS:
            searchTerms = Files.DOCUMENT_TYPES;
            break;
        case FileFilters.SPREADSHEETS:
            searchTerms = Files.SPREADSHEET_TYPES;
            break;
        case FileFilters.PRESENTATIONS:
            searchTerms = Files.PRESENTATION_TYPES;
            break;
        case FileFilters.CODE:
            searchTerms = Files.CODE_TYPES;
            break;
        case FileFilters.IMAGES:
            searchTerms = Files.IMAGE_TYPES;
            break;
        case FileFilters.AUDIO:
            searchTerms = Files.AUDIO_TYPES;
            break;
        case FileFilters.VIDEOS:
            searchTerms = Files.VIDEO_TYPES;
            break;
        default:
            return '';
    }
    return 'ext:' + searchTerms.join(' ext:');
}

/**
 * Populate the extensions and types maps.
 * @private
 */

function populateMaps() {
    // source preference (least -> most)
    const preference = ['nginx', 'apache', undefined, 'iana'];

    Object.keys(mimeDB).forEach((type) => {
        const mime = mimeDB[type];
        const exts = mime.extensions;

        if (!exts || !exts.length) {
            return;
        }

        extensions[type] = exts;

        for (let i = 0; i < exts.length; i++) {
            const extension = exts[i];

            if (types[extension]) {
                const from = preference.indexOf(mimeDB[types[extension]].source);
                const to = preference.indexOf(mime.source);

                if (types[extension] !== 'application/octet-stream' &&
                    (from > to || (from === to && types[extension].substr(0, 12) === 'application/'))) {
                    continue;
                }
            }

            types[extension] = type;
        }
    });
}

export async function deleteV1Data() {
    const dir = Platform.OS === 'ios' ? getIOSAppGroupDetails().appGroupSharedDirectory : FileSystem.DocumentDirectoryPath;

    try {
        const directory = `${dir}/mmkv`;
        const mmkvDirInfo = await FileSystem.exists(directory);
        if (mmkvDirInfo) {
            await FileSystem.unlink(directory);
        }
    } catch {
        // do nothing
    }

    try {
        const entitiesInfo = await FileSystem.exists(`${dir}/entities`);
        if (entitiesInfo) {
            deleteEntititesFile();
        }
    } catch (e) {
        // do nothing
    }
}

export async function deleteFileCache(serverUrl: string) {
    const serverDir = urlSafeBase64Encode(serverUrl);
    return deleteFileCacheByDir(serverDir);
}

export async function deleteFileCacheByDir(dir: string) {
    if (Platform.OS === 'ios') {
        const appGroupCacheDir = `${getIOSAppGroupDetails().appGroupSharedDirectory}/Library/Caches/${dir}`;
        await deleteFilesInDir(appGroupCacheDir);
    }

    const cacheDir = `${FileSystem.CachesDirectoryPath}/${dir}`;
    await deleteFilesInDir(cacheDir);

    return true;
}

async function deleteFilesInDir(directory: string) {
    if (directory) {
        const cacheDirInfo = await FileSystem.exists(directory);
        if (cacheDirInfo) {
            if (Platform.OS === 'ios') {
                await FileSystem.unlink(directory);
                await FileSystem.mkdir(directory);
            } else {
                const lstat = await FileSystem.readDir(directory);
                lstat.forEach((stat: FileSystem.ReadDirItem) => {
                    FileSystem.unlink(stat.path);
                });
            }
        }
    }
}

export function lookupMimeType(filename: string) {
    if (!Object.keys(extensions).length) {
        populateMaps();
    }

    const ext = filename.split('.').pop()?.toLowerCase();
    return types[ext!] || 'application/octet-stream';
}

export function getExtensionFromMime(type: string) {
    if (!Object.keys(extensions).length) {
        populateMaps();
    }

    if (!type || typeof type !== 'string') {
        return undefined;
    }

    const match = EXTRACT_TYPE_REGEXP.exec(type);

    // get extensions
    const exts = match && extensions[match[1].toLowerCase()];

    if (!exts || !exts.length) {
        return undefined;
    }

    return exts[0];
}

export function getExtensionFromContentDisposition(contentDisposition: string) {
    const match = CONTENT_DISPOSITION_REGEXP.exec(contentDisposition);
    let extension = match && match[1];
    if (extension) {
        if (!Object.keys(types).length) {
            populateMaps();
        }

        extension = extension.toLowerCase();
        if (types[extension]) {
            return extension;
        }

        return null;
    }

    return null;
}

export const getAllowedServerMaxFileSize = (config: ClientConfig) => {
    return config && config.MaxFileSize ? parseInt(config.MaxFileSize, 10) : DEFAULT_SERVER_MAX_FILE_SIZE;
};

export const isGif = (file?: FileInfo | FileModel) => {
    if (!file) {
        return false;
    }

    let mime = 'mime_type' in file ? file.mime_type : file.mimeType;
    if (mime && mime.includes(';')) {
        mime = mime.split(';')[0];
    } else if (!mime && file?.name) {
        mime = lookupMimeType(file.name);
    }

    return mime === 'image/gif';
};

export const isImage = (file?: FileInfo | FileModel) => {
    if (!file) {
        return false;
    }

    if (isGif(file)) {
        return true;
    }

    let mimeType = 'mime_type' in file ? file.mime_type : file.mimeType;
    if (!mimeType) {
        mimeType = lookupMimeType(file.extension) || lookupMimeType(file.name);
    }

    return Boolean(mimeType?.startsWith('image/'));
};

export const isDocument = (file?: FileInfo | FileModel) => {
    if (!file) {
        return false;
    }

    let mime = 'mime_type' in file ? file.mime_type : file.mimeType;
    if (mime && mime.includes(';')) {
        mime = mime.split(';')[0];
    } else if (!mime && file?.name) {
        mime = lookupMimeType(file.name);
    }

    return SUPPORTED_DOCS_FORMAT!.includes(mime);
};

export const isVideo = (file?: FileInfo | FileModel) => {
    if (!file) {
        return false;
    }

    let mime = 'mime_type' in file ? file.mime_type : file.mimeType;
    if (mime && mime.includes(';')) {
        mime = mime.split(';')[0];
    } else if (!mime && file?.name) {
        mime = lookupMimeType(file.name);
    }

    return SUPPORTED_VIDEO_FORMAT!.includes(mime);
};

export function getFormattedFileSize(bytes: number): string {
    const fileSizes: Array<[string, number]> = [
        ['TB', 1024 * 1024 * 1024 * 1024],
        ['GB', 1024 * 1024 * 1024],
        ['MB', 1024 * 1024],
        ['KB', 1024],
    ];
    const size = fileSizes.find((unitAndMinBytes) => {
        const minBytes = unitAndMinBytes[1];
        return bytes > minBytes;
    });

    if (size) {
        return `${Math.floor(bytes / (size[1]))} ${size[0]}`;
    }

    return `${bytes} B`;
}

export function getFileType(file: FileInfo): string {
    if (!file || !file.extension) {
        return 'other';
    }

    const fileExt = file.extension.toLowerCase();
    const fileTypes = [
        'image',
        'code',
        'pdf',
        'video',
        'audio',
        'spreadsheet',
        'text',
        'word',
        'presentation',
        'patch',
        'zip',
    ];

    return fileTypes.find((fileType) => {
        const constForFileTypeExtList = `${fileType}_types`.toUpperCase();
        const fileTypeExts = Files[constForFileTypeExtList];
        return fileTypeExts.indexOf(fileExt) > -1;
    }) || 'other';
}

export function getLocalFilePathFromFile(serverUrl: string, file: FileInfo | FileModel) {
    const fileIdPath = file.id?.replace(/[^0-9a-z]/g, '');
    if (serverUrl) {
        const server = urlSafeBase64Encode(serverUrl);
        const hasValidFilename = file?.name && !file.name.includes('/');
        const hasValidExtension = file?.extension && !file.extension.includes('/');
        if (hasValidFilename) {
            let extension: string | undefined = file.extension;
            let filename = file.name;

            if (!hasValidExtension) {
                const mimeType = (file instanceof Model) ? file.mimeType : file.mime_type;
                extension = getExtensionFromMime(mimeType);
            }

            if (extension && filename.includes(`.${extension}`)) {
                filename = filename.replace(`.${extension}`, '');
            } else {
                const fileParts = file.name.split('.');

                if (fileParts.length > 1) {
                    extension = fileParts.pop();
                    filename = fileParts.join('.');
                }
            }

            return `${FileSystem.CachesDirectoryPath}/${server}/${filename}-${fileIdPath}.${extension}`;
        } else if (file?.id && hasValidExtension) {
            return `${FileSystem.CachesDirectoryPath}/${server}/${fileIdPath}.${file.extension}`;
        } else if (file?.id) {
            return `${FileSystem.CachesDirectoryPath}/${server}/${fileIdPath}`;
        }
    }

    throw new Error('File path could not be set');
}

export async function extractFileInfo(files: Array<Asset | DocumentPickerResponse | PastedFile>) {
    const out: ExtractedFileInfo[] = [];

    await Promise.all(files.map(async (file) => {
        if (!file || !file.uri) {
            logError('extractFileInfo no file or url');
            return;
        }

        const outFile = {
            progress: 0,
            localPath: file.uri,
            clientId: generateId(),
            loading: true,
        } as unknown as ExtractedFileInfo;

        if ('fileSize' in file) {
            outFile.size = file.fileSize || 0;
            outFile.name = file.fileName || '';
        } else {
            const localPath = Platform.select({
                ios: (file.uri || '').replace('file://', ''),
                default: file.uri || '',
            });
            try {
                const fileInfo = await FileSystem.stat(decodeURIComponent(localPath));
                outFile.size = fileInfo.size || 0;
                outFile.name = localPath.substring(localPath.lastIndexOf('/') + 1);
            } catch (e) {
                logError('extractFileInfo', e);
                return;
            }
        }

        if (file.type) {
            outFile.mime_type = file.type;
        } else {
            outFile.mime_type = lookupMimeType(outFile.name);
        }

        out.push(outFile);
    }));

    return out;
}

export function fileSizeWarning(intl: IntlShape, maxFileSize: number) {
    return intl.formatMessage({
        id: 'file_upload.fileAbove',
        defaultMessage: 'Files must be less than {max}',
    }, {
        max: getFormattedFileSize(maxFileSize),
    });
}

export function fileMaxWarning(intl: IntlShape, maxFileCount: number) {
    return intl.formatMessage({
        id: 'mobile.file_upload.max_warning',
        defaultMessage: 'Uploads limited to {count} files maximum.',
    }, {
        count: maxFileCount,
    });
}

export function uploadDisabledWarning(intl: IntlShape) {
    return intl.formatMessage({
        id: 'mobile.file_upload.disabled2',
        defaultMessage: 'File uploads from mobile are disabled.',
    });
}

export const fileExists = async (path: string) => {
    try {
        const filePath = Platform.select({ios: path.replace('file://', ''), default: path});
        return FileSystem.exists(filePath);
    } catch {
        return false;
    }
};

export const hasWriteStoragePermission = async (intl: IntlShape) => {
    if (Platform.OS === 'android' && Platform.Version < 33) {
        const storagePermission = PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE;
        let permissionRequest;
        const hasPermissionToStorage = await Permissions.check(storagePermission);
        switch (hasPermissionToStorage) {
            case Permissions.RESULTS.DENIED:
                permissionRequest = await Permissions.request(storagePermission);
                return permissionRequest === Permissions.RESULTS.GRANTED;
            case Permissions.RESULTS.BLOCKED: {
                const applicationName = DeviceInfo.getApplicationName();
                const title = intl.formatMessage(
                    {
                        id: 'mobile.storage_permission_denied_title',
                        defaultMessage:
                            '{applicationName} would like to access your files',
                    },
                    {applicationName},
                );
                const text = intl.formatMessage(
                    {
                        id: 'mobile.write_storage_permission_denied_description',
                        defaultMessage:
                            'Save files to your device. Open Settings to grant {applicationName} write access to files on this device.',
                    },
                    {applicationName},
                );

                Alert.alert(title, text, [
                    {
                        text: intl.formatMessage({
                            id: 'mobile.permission_denied_dismiss',
                            defaultMessage: "Don't Allow",
                        }),
                    },
                    {
                        text: intl.formatMessage({
                            id: 'mobile.permission_denied_retry',
                            defaultMessage: 'Settings',
                        }),
                        onPress: () => Linking.openSettings(),
                    },
                ]);
                return false;
            }
            default: return true;
        }
    }

    return true;
};

export const getAllFilesInCachesDirectory = async (serverUrl: string) => {
    try {
        const files: FileSystem.ReadDirItem[][] = [];

        const promises = [FileSystem.readDir(`${FileSystem.CachesDirectoryPath}/${urlSafeBase64Encode(serverUrl)}`)];
        if (Platform.OS === 'ios') {
            const cacheDir = `${getIOSAppGroupDetails().appGroupSharedDirectory}/Library/Caches/${urlSafeBase64Encode(serverUrl)}`;
            promises.push(FileSystem.readDir(cacheDir));
        }

        const dirs = await Promise.allSettled(promises);
        dirs.forEach((p) => {
            if (p.status === 'fulfilled') {
                files.push(p.value);
            }
        });

        const flattenedFiles = files.flat();
        const totalSize = flattenedFiles.reduce((acc, file) => acc + file.size, 0);
        return {
            files: flattenedFiles,
            totalSize,
        };
    } catch (error) {
        return {error};
    }
};

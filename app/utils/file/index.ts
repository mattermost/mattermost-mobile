// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PastedFile} from '@mattermost/react-native-paste-input';
import Model from '@nozbe/watermelondb/Model';
import * as FileSystem from 'expo-file-system';
import mimeDB from 'mime-db';
import {IntlShape} from 'react-intl';
import {Platform} from 'react-native';
import {DocumentPickerResponse} from 'react-native-document-picker';
import {Asset} from 'react-native-image-picker';

import {Files} from '@constants';
import {generateId} from '@utils/general';
import {deleteEntititesFile, getIOSAppGroupDetails} from '@utils/mattermost_managed';
import {hashCode} from '@utils/security';
import {removeProtocol} from '@utils/url';

import type FileModel from '@typings/database/models/servers/file';

const EXTRACT_TYPE_REGEXP = /^\s*([^;\s]*)(?:;|\s|$)/;
const CONTENT_DISPOSITION_REGEXP = /inline;filename=".*\.([a-z]+)";/i;
const DEFAULT_SERVER_MAX_FILE_SIZE = 50 * 1024 * 1024;// 50 Mb

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
    android: ['video/3gpp', 'video/x-matroska', 'video/mp4', 'video/webm'],
});

const types: Record<string, string> = {};
const extensions: Record<string, readonly string[]> = {};

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

const vectorIconsDir = 'vectorIcons';
const dirsToExclude = ['Cache.db', 'WebKit', 'WebView', vectorIconsDir];
async function getDirectorySize(fileStats: FileSystem.FileInfo) {
    if (fileStats?.exists) {
        let total = 0;
        if (fileStats.isDirectory) {
            const exclude = dirsToExclude.find((f) => fileStats.uri.includes(f));
            if (!exclude) {
                const paths = await FileSystem.readDirectoryAsync(fileStats.uri);
                for await (const path of paths) {
                    const info = await FileSystem.getInfoAsync(`${fileStats.uri}/${path}`, {size: true});
                    if (info.isDirectory) {
                        const dirSize = await getDirectorySize(info);
                        total += dirSize;
                    } else {
                        total += (info.size || 0);
                    }
                }
            }
        } else {
            total = fileStats.size;
        }

        return total;
    }

    return 0;
}

export async function getFileCacheSize() {
    if (FileSystem.cacheDirectory) {
        const cacheStats = await FileSystem.getInfoAsync(FileSystem.cacheDirectory);
        const size = await getDirectorySize(cacheStats);

        return size;
    }

    return 0;
}

export async function deleteV1Data() {
    const dir = Platform.OS === 'ios' ? getIOSAppGroupDetails().appGroupSharedDirectory : FileSystem.documentDirectory;

    try {
        const mmkvDirInfo = await FileSystem.getInfoAsync(`${dir}/mmkv`);
        if (mmkvDirInfo.exists) {
            await FileSystem.deleteAsync(mmkvDirInfo.uri, {idempotent: true});
        }
    } catch {
        // do nothing
    }

    try {
        const entitiesInfo = await FileSystem.getInfoAsync(`${dir}/entities`);
        if (entitiesInfo.exists) {
            deleteEntititesFile();
        }
    } catch (e) {
        // do nothing
    }
}

export async function deleteFileCache(serverUrl: string) {
    const serverDir = hashCode(serverUrl);
    const cacheDir = `${FileSystem.cacheDirectory}/${serverDir}`;
    if (cacheDir) {
        const cacheDirInfo = await FileSystem.getInfoAsync(cacheDir);
        if (cacheDirInfo.exists) {
            if (Platform.OS === 'ios') {
                await FileSystem.deleteAsync(cacheDir, {idempotent: true});
                await FileSystem.makeDirectoryAsync(cacheDir, {intermediates: true});
            } else {
                const lstat = await FileSystem.readDirectoryAsync(cacheDir);
                lstat.forEach((stat: string) => {
                    FileSystem.deleteAsync(stat, {idempotent: true});
                });
            }
        }
    }

    return true;
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

    const fi = file as FileInfo;
    const fm = file as FileModel;
    let mime = fi.mime_type || fm.mimeType || '';
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
    const fi = file as FileInfo;
    const fm = file as FileModel;

    const hasPreview = Boolean(fi.mini_preview || fm.imageThumbnail);
    const mimeType = fi.mime_type || fm.mimeType || '';

    return (hasPreview || isGif(file) || mimeType.startsWith('image/'));
};

export const isDocument = (file?: FileInfo | FileModel) => {
    if (!file) {
        return false;
    }

    const fi = file as FileInfo;
    const fm = file as FileModel;
    let mime = fi.mime_type || fm.mimeType || '';
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

    const fi = file as FileInfo;
    const fm = file as FileModel;
    let mime = fi.mime_type || fm.mimeType || '';
    if (mime && mime.includes(';')) {
        mime = mime.split(';')[0];
    } else if (!mime && file?.name) {
        mime = lookupMimeType(file.name);
    }

    return SUPPORTED_VIDEO_FORMAT!.includes(mime);
};

export function getFormattedFileSize(bytes: number): string {
    const fileSizes = [
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
        return `${Math.floor(bytes / (size[1] as number))} ${size[0]}`;
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

export function getLocalFilePathFromFile(dir: string, serverUrl: string, file: FileInfo | FileModel) {
    if (dir && serverUrl) {
        const server = removeProtocol(serverUrl);
        if (file?.name) {
            let extension: string | undefined = file.extension;
            let filename = file.name;

            if (!extension) {
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

            return `${dir}/${server}/${filename}-${hashCode(file.id!)}.${extension}`;
        } else if (file?.id && file?.extension) {
            return `${dir}/${server}/${file.id}.${file.extension}`;
        }
    }

    return undefined;
}

export async function extractFileInfo(files: Array<Asset | DocumentPickerResponse | PastedFile>) {
    const out: ExtractedFileInfo[] = [];

    await Promise.all(files.map(async (file) => {
        if (!file) {
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
            const path = Platform.select({
                ios: (file.uri || '').replace('file://', ''),
                default: file.uri || '',
            });
            let fileInfo;
            try {
                fileInfo = await FileSystem.getInfoAsync(path);
                const uri = fileInfo.uri;
                outFile.size = fileInfo.size || 0;
                outFile.name = uri.substring(uri.lastIndexOf('/') + 1);
            } catch (e) {
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

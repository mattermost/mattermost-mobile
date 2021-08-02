// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import mimeDB from 'mime-db';
import {Platform} from 'react-native';
import {FileSystem} from 'react-native-unimodules';

import {hashCode} from '@utils/security';

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

export const isGif = (file?: FileInfo) => {
    let mime = file?.mime_type || '';
    if (mime && mime.includes(';')) {
        mime = mime.split(';')[0];
    } else if (!mime && file?.name) {
        mime = lookupMimeType(file.name);
    }

    return mime === 'image/gif';
};

export const isImage = (file?: FileInfo) => (file?.has_preview_image || isGif(file) || file?.mime_type?.startsWith('image/'));

export const isDocument = (file?: FileInfo) => {
    let mime = file?.mime_type || '';
    if (mime && mime.includes(';')) {
        mime = mime.split(';')[0];
    } else if (!mime && file?.name) {
        mime = lookupMimeType(file.name);
    }

    return SUPPORTED_DOCS_FORMAT!.includes(mime);
};

export const isVideo = (file?: FileInfo) => {
    let mime = file?.mime_type || '';
    if (mime && mime.includes(';')) {
        mime = mime.split(';')[0];
    } else if (!mime && file?.name) {
        mime = lookupMimeType(file.name);
    }

    return SUPPORTED_VIDEO_FORMAT!.includes(mime);
};

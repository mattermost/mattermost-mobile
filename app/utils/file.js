// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import RNFetchBlob from 'react-native-fetch-blob';
import {lookupMimeType} from 'mattermost-redux/utils/file_utils';
import {DeviceTypes} from 'app/constants/';

const {DOCUMENTS_PATH, VIDEOS_PATH} = DeviceTypes;
const DEFAULT_SERVER_MAX_FILE_SIZE = 50 * 1024 * 1024;// 50 Mb

export function generateId() {
    // Implementation taken from http://stackoverflow.com/a/2117523
    let id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';

    id = id.replace(/[xy]/g, (c) => {
        const r = Math.floor(Math.random() * 16);

        let v;
        if (c === 'x') {
            v = r;
        } else {
            v = (r & 0x3) | 0x8;
        }

        return v.toString(16);
    });

    return 'uid' + id;
}

export async function getFileCacheSize() {
    const isDocsDir = await RNFetchBlob.fs.isDir(DOCUMENTS_PATH);
    const isVideosDir = await RNFetchBlob.fs.isDir(VIDEOS_PATH);
    let size = 0;

    if (isDocsDir) {
        const docsStats = await RNFetchBlob.fs.lstat(DOCUMENTS_PATH);
        size = docsStats.reduce((accumulator, stat) => {
            return accumulator + parseInt(stat.size, 10);
        }, size);
    }

    if (isVideosDir) {
        const videoStats = await RNFetchBlob.fs.lstat(VIDEOS_PATH);
        size = videoStats.reduce((accumulator, stat) => {
            return accumulator + parseInt(stat.size, 10);
        }, size);
    }

    return size;
}

export async function deleteFileCache() {
    await RNFetchBlob.fs.unlink(DOCUMENTS_PATH);
    await RNFetchBlob.fs.unlink(VIDEOS_PATH);
    return true;
}

export function buildFileUploadData(file) {
    const re = /heic/i;
    const uri = file.uri;
    let name = file.fileName || file.path || file.uri;
    let mimeType = lookupMimeType(name);
    let extension = name.split('.').pop().replace('.', '');

    if (re.test(extension)) {
        extension = 'JPG';
        name = name.replace(re, 'jpg');
        mimeType = 'image/jpeg';
    }

    return {
        uri,
        name,
        type: mimeType,
        extension,
    };
}

export const encodeHeaderURIStringToUTF8 = (string) => {
    return encodeURIComponent(string) + '"; filename*="utf-8\'\'' + encodeURIComponent(string);
};

export const getAllowedServerMaxFileSize = (config) => {
    return config.MaxFileSize ? parseInt(config.MaxFileSize, 10) : DEFAULT_SERVER_MAX_FILE_SIZE;
};

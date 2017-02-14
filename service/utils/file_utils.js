// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

/* eslint-disable
    no-magic-numbers */

import {Constants} from 'service/constants';

export function getTrimmedFilename(file) {
    const fileName = file.name;
    if (fileName.length > 35) {
        return fileName.substring(0, Math.min(35, fileName.length)) + '...';
    }
    return fileName;
}

export function fileSizeToString(bytes) {
    if (bytes > 1024 * 1024 * 1024 * 1024) {
        return Math.floor(bytes / (1024 * 1024 * 1024 * 1024)) + 'TB';
    } else if (bytes > 1024 * 1024 * 1024) {
        return Math.floor(bytes / (1024 * 1024 * 1024)) + 'GB';
    } else if (bytes > 1024 * 1024) {
        return Math.floor(bytes / (1024 * 1024)) + 'MB';
    } else if (bytes > 1024) {
        return Math.floor(bytes / 1024) + 'KB';
    }
    return bytes + 'B';
}

export function getFileIconPath(file) {
    const fileType = getFileType(file);
    return Constants.ICON_PATH_FROM_FILE_TYPE[fileType] ||
        Constants.ICON_PATH_FROM_FILE_TYPE.other;
}

function getFileType(file) {
    const fileExt = file.extension.toLowerCase();
    const fileTypes = [
        'image',
        'audio',
        'video',
        'spreadsheet',
        'code',
        'word',
        'presentation',
        'pdf',
        'patch'
    ];
    return fileTypes.find((fileType) => {
        const constForFileTypeExtList = `${fileType}_types`.toUpperCase();
        const fileTypeExts = Constants[constForFileTypeExtList];
        return fileTypeExts.indexOf(fileExt) > -1;
    }) || 'other';
}

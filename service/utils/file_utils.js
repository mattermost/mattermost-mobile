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

export function getFileIconPath(fileInfo) {
    const fileType = getFileType(fileInfo.extension);

    let icon;
    if (fileType in Constants.ICON_FROM_TYPE) {
        icon = Constants.ICON_FROM_TYPE[fileType];
    } else {
        icon = Constants.ICON_FROM_TYPE.other;
    }

    return icon;
}

function getFileType(extin) {
    const ext = extin.toLowerCase();
    if (Constants.IMAGE_TYPES.indexOf(ext) > -1) {
        return 'image';
    }

    if (Constants.AUDIO_TYPES.indexOf(ext) > -1) {
        return 'audio';
    }

    if (Constants.VIDEO_TYPES.indexOf(ext) > -1) {
        return 'video';
    }

    if (Constants.SPREADSHEET_TYPES.indexOf(ext) > -1) {
        return 'spreadsheet';
    }

    if (Constants.CODE_TYPES.indexOf(ext) > -1) {
        return 'code';
    }

    if (Constants.WORD_TYPES.indexOf(ext) > -1) {
        return 'word';
    }

    if (Constants.PRESENTATION_TYPES.indexOf(ext) > -1) {
        return 'presentation';
    }

    if (Constants.PDF_TYPES.indexOf(ext) > -1) {
        return 'pdf';
    }

    if (Constants.PATCH_TYPES.indexOf(ext) > -1) {
        return 'patch';
    }

    return 'other';
}

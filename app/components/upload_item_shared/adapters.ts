// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {UploadItemFile} from './index';
export {SHARED_UPLOAD_STYLES} from './constants';
import type {SharedItem} from '@mattermost/rnshare';

/**
 * Convert FileInfo to UploadItemFile for the shared component
 */
export function fileInfoToUploadItemFile(file: FileInfo): UploadItemFile {
    return {
        id: file.id,
        clientId: file.clientId,
        name: file.name,
        extension: file.extension,
        size: file.size,
        uri: file.uri || file.localPath,
        failed: file.failed,
        width: file.width,
        height: file.height,
        mime_type: file.mime_type,
    };
}

/**
 * Convert SharedItem to UploadItemFile for the shared component
 */
export function sharedItemToUploadItemFile(item: SharedItem): UploadItemFile {
    return {
        id: undefined,
        clientId: undefined,
        name: item.filename,
        extension: item.extension,
        size: item.size,
        uri: item.value,
        failed: false,
        width: item.width,
        height: item.height,
        mime_type: item.type,
    };
}

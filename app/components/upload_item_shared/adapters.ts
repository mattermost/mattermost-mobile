// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {UploadItemFile} from './index';
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
    const converted = {
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

    return converted;
}

/**
 * Shared styling constants that match the main app's upload item dimensions
 */
export const SHARED_UPLOAD_STYLES = {
    THUMBNAIL_SIZE: 64,
    ICON_SIZE: 48,
    FILE_CONTAINER_WIDTH: 264,
    FILE_CONTAINER_HEIGHT: 64,
    BORDER_RADIUS: 4,
    SHADOW_OFFSET: {width: 0, height: 2},
    SHADOW_OPACITY: 0.08,
    SHADOW_RADIUS: 3,
    ELEVATION: 1,
} as const;

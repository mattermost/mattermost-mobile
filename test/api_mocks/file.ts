// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function mockFileInfo(overwrite: Partial<FileInfo> = {}): FileInfo {
    return {
        id: '1',
        localPath: 'path/to/image1',
        uri: '',
        has_preview_image: true,
        extension: 'png',
        height: 100,
        width: 100,
        mime_type: 'image/png',
        name: 'image1',
        size: 100,
        user_id: '1',
        ...overwrite,
    };
}

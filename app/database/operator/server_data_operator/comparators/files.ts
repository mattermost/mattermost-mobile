// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type FileModel from '@typings/database/models/servers/file';

export const shouldUpdateFileRecord = (e: FileModel, n: FileInfo): boolean => {
    return Boolean(
        (n.post_id !== e.postId) ||
        (n.name !== e.name) ||
        (n.extension !== e.extension) ||
        (n.size !== e.size) ||
        ((n.mime_type || '') !== e.mimeType) ||
        (n.width && n.width !== e.width) ||
        (n.height && n.height !== e.height) ||
        (n.mini_preview && n.mini_preview !== e.imageThumbnail) ||
        (n.localPath && n.localPath !== e.localPath),
    );
};

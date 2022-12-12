// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function toFileInfo(f: SharedItem): FileInfo {
    return {
        post_id: '',
        user_id: '',
        extension: f.extension,
        mime_type: f.type,
        has_preview_image: (f.width || 0) > 0,
        height: f.height || 0,
        width: f.width || 0,
        name: f.filename || '',
        size: f.size || 0,
        uri: f.value,
    };
}

export function imageDimensions(imgHeight: number, imgWidth: number, maxHeight: number, viewportWidth: number) {
    if (!imgHeight || !imgWidth) {
        return {
            height: 0,
            width: 0,
        };
    }

    const widthRatio = imgWidth / imgHeight;
    const heightRatio = imgWidth / imgHeight;
    let height = imgHeight;
    let width = imgWidth;

    if (imgWidth >= viewportWidth) {
        width = viewportWidth;
        height = width * widthRatio;
    }

    if (height > maxHeight) {
        height = maxHeight;
        width = height * heightRatio;
    }

    return {height, width};
}

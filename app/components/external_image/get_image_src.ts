// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function getImageSrc(src: string, baseRoute: string, hasImageProxy = false): string {
    if (!src) {
        return src;
    }

    // Don't proxy base64-encoded images
    if (src.startsWith('data:image/')) {
        return src;
    }

    const imageAPI = `${baseRoute}/image?url=`;

    if (hasImageProxy && !src.startsWith(imageAPI)) {
        return imageAPI + encodeURIComponent(src);
    }

    return src;
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function filterPostsInOrderedArray(posts?: IDMappedObjects<Post>, order?: string[]) {
    const result: IDMappedObjects<Post> = {};

    if (!posts || !order) {
        return result;
    }

    for (const id of order) {
        if (posts[id]) {
            result[id] = posts[id];
        }
    }

    return result;
}

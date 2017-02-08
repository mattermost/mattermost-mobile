// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Constants} from 'service/constants';

export function isSystemMessage(post) {
    return post.type && post.type.startsWith(Constants.SYSTEM_MESSAGE_PREFIX);
}

export function addDatesToPostList(posts) {
    const out = [];

    let lastDate = null;
    for (const post of posts) {
        const postDate = new Date(post.create_at);

        // Push on a date header if the last post was on a different day than the current one
        if (lastDate && lastDate.toDateString() !== postDate.toDateString()) {
            out.push(lastDate);
        }

        lastDate = postDate;
        out.push(post);
    }

    // Push on the date header for the oldest post
    if (lastDate) {
        out.push(lastDate);
    }

    return out;
}

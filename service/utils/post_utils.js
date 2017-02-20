// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Constants} from 'service/constants';

export function isSystemMessage(post) {
    return post.type && post.type.startsWith(Constants.SYSTEM_MESSAGE_PREFIX);
}

export function addDatesToPostList(posts, indicateNewMessages, lastViewedAt) {
    const out = [];

    let lastDate = null;
    let subsequentPostIsUnread = false;
    let postIsUnread;
    for (const post of posts) {
        const postDate = new Date(post.create_at);

        // Push on a date header if the last post was on a different day than the current one
        if (lastDate && lastDate.toDateString() !== postDate.toDateString()) {
            out.push(lastDate);
        }

        lastDate = postDate;
        out.push(post);

        postIsUnread = post.create_at > lastViewedAt;
        if (indicateNewMessages && subsequentPostIsUnread && !postIsUnread) {
            out.push(Constants.START_OF_NEW_MESSAGES);
        }
        subsequentPostIsUnread = postIsUnread;
    }

    // Push on the date header for the oldest post
    if (lastDate) {
        out.push(lastDate);
    }

    return out;
}

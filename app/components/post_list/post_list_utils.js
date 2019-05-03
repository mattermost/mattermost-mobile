// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isDateLine, isStartOfNewMessages} from 'mattermost-redux/utils/post_list';

export function getLastPostIndex(postIds) {
    let index = 0;
    for (let i = postIds.length - 1; i > 0; i--) {
        const item = postIds[i];
        if (!isStartOfNewMessages(item) && !isDateLine(item)) {
            index = i;
            break;
        }
    }

    return index;
}

export function keyExtractor(item) {
    // All keys are strings (either post IDs or special keys)
    return item;
}

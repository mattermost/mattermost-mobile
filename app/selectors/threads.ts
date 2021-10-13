// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {getThread} from '@mm-redux/selectors/entities/threads';

import type {GlobalState} from '@mm-redux/types/store';
import type {UserThread} from '@mm-redux/types/threads';
import type {$ID} from '@mm-redux/types/utilities';

export function getThreadLastViewedAt(state: GlobalState, threadId: $ID<UserThread>): number {
    if (state.views.threads.lastViewedAt[threadId]) {
        // timestamp - 1, to properly mark "new messages" in threads when manually unread as lastViewedAt is set to the post's created timestamp
        return state.views.threads.lastViewedAt[threadId] - 1;
    }
    return getThread(state, threadId)?.last_viewed_at || 0;
}

export function getViewingGlobalThreads(state: GlobalState): boolean {
    return state.views.threads.viewingGlobalThreads;
}

export function getViewingGlobalThreadsUnread(state: GlobalState): boolean {
    return state.views.threads.viewingGlobalThreadsUnreads;
}

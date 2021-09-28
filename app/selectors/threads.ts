// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {getThread} from '@mm-redux/selectors/entities/threads';

import type {GlobalState} from '@mm-redux/types/store';
import type {UserThread} from '@mm-redux/types/threads';
import type {$ID} from '@mm-redux/types/utilities';

export function getThreadLastViewedAt(state: GlobalState, threadId: $ID<UserThread>): number {
    return state.views.threads.lastViewedAt[threadId] || getThread(state, threadId)?.last_viewed_at;
}

export function getViewingGlobalThreads(state: GlobalState): boolean {
    return state.views.threads.viewingGlobalThreads;
}

export function getViewingGlobalThreadsUnread(state: GlobalState): boolean {
    return state.views.threads.viewingGlobalThreadsUnreads;
}

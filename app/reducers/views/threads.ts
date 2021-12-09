// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {combineReducers} from 'redux';

import {ViewTypes} from '@constants';
import {GenericAction} from '@mm-redux/types/actions';

export const lastViewedAt = (state: Record<string, number> = {}, action: GenericAction) => {
    switch (action.type) {
    case ViewTypes.THREAD_LAST_VIEWED_AT:
        return {
            ...state,
            [action.data.threadId]: action.data.lastViewedAt,
        };
    }
    return state;
};

const viewingGlobalThreads = (state = false, action: GenericAction) => {
    switch (action.type) {
    case ViewTypes.VIEWING_GLOBAL_THREADS_SCREEN: {
        return true;
    }
    case ViewTypes.NOT_VIEWING_GLOBAL_THREADS_SCREEN: {
        return false;
    }
    }
    return state;
};

const viewingGlobalThreadsUnreads = (state = false, action: GenericAction) => {
    switch (action.type) {
    case ViewTypes.VIEWING_GLOBAL_THREADS_UNREADS: {
        return true;
    }
    case ViewTypes.VIEWING_GLOBAL_THREADS_ALL: {
        return false;
    }
    }
    return state;
};

export default combineReducers({
    lastViewedAt,
    viewingGlobalThreads,
    viewingGlobalThreadsUnreads,
});

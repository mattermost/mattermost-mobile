// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';
import {
    ChannelTypes,
    FileTypes,
    PostTypes,
} from 'mattermost-redux/action_types';

import {ViewTypes} from 'app/constants';

function displayName(state = '', action) {
    switch (action.type) {
    case ViewTypes.SET_CHANNEL_DISPLAY_NAME:
        return action.displayName || '';
    default:
        return state;
    }
}

function handlePostDraftChanged(state, action) {
    return {
        ...state,
        [action.channelId]: Object.assign({}, state[action.channelId], {draft: action.draft}),
    };
}

function handleSetPostDraft(state, action) {
    return {
        ...state,
        [action.channelId]: {
            draft: action.draft,
            cursorPosition: 0,
            files: action.files,
        },
    };
}

function handleSelectChannel(state, action) {
    let data = {...state};
    if (action.data && !data[action.data]) {
        data = {
            ...state,
            [action.data]: {
                draft: '',
                cursorPosition: 0,
                files: [],
            },
        };
    }

    return data;
}

function handleSetTempUploadFileForPostDraft(state, action) {
    if (action.rootId) {
        return state;
    }

    const tempFiles = action.clientIds.map((temp) => ({...temp, loading: true}));
    const files = [
        ...state[action.channelId].files,
        ...tempFiles,
    ];

    return {
        ...state,
        [action.channelId]: Object.assign({}, state[action.channelId], {files}),
    };
}

function handleRetryUploadFileForPost(state, action) {
    if (action.rootId) {
        return state;
    }

    const files = state[action.channelId].files.map((f) => {
        if (f.clientId === action.clientId) {
            return {
                ...f,
                loading: true,
                failed: false,
            };
        }

        return f;
    });

    return {
        ...state,
        [action.channelId]: Object.assign({}, state[action.channelId], {files}),
    };
}

function handleReceivedUploadFiles(state, action) {
    if (action.rootId || !state[action.channelId].files) {
        return state;
    }

    // Reconcile tempFiles with the received uploaded files
    const files = state[action.channelId].files.map((tempFile) => {
        const file = action.data.find((f) => f.clientId === tempFile.clientId);
        if (file) {
            return {
                ...file,
                localPath: tempFile.localPath,
                loading: false,
            };
        }

        return tempFile;
    });

    return {
        ...state,
        [action.channelId]: Object.assign({}, state[action.channelId], {files}),
    };
}

function handleUploadFilesFailure(state, action) {
    if (action.rootId) {
        return state;
    }

    const clientIds = action.clientIds;
    const files = state[action.channelId].files.map((tempFile) => {
        if (clientIds.includes(tempFile.clientId)) {
            return {
                ...tempFile,
                loading: false,
                failed: true,
            };
        }

        return tempFile;
    });

    return {
        ...state,
        [action.channelId]: Object.assign({}, state[action.channelId], {files}),
    };
}

function handleClearFilesForPostDraft(state, action) {
    if (action.rootId) {
        return state;
    }

    return {
        ...state,
        [action.channelId]: Object.assign({}, state[action.channelId], {files: []}),
    };
}

function handleRemoveFileFromPostDraft(state, action) {
    if (action.rootId) {
        return state;
    }

    const files = state[action.channelId].files.filter((file) => (file.clientId !== action.clientId));

    return {
        ...state,
        [action.channelId]: Object.assign({}, state[action.channelId], {files}),
    };
}

function handleRemoveLastFileFromPostDraft(state, action) {
    if (action.rootId) {
        return state;
    }

    const files = [...state[action.channelId].files];
    files.splice(-1);

    return {
        ...state,
        [action.channelId]: Object.assign({}, state[action.channelId], {files}),
    };
}

function handleRemoveFailedFilesFromPostDraft(state, action) {
    if (action.rootId) {
        return state;
    }

    const files = state[action.channelId].files.filter((f) => !f.failed);
    return {
        ...state,
        [action.channelId]: Object.assign({}, state[action.channelId], {files}),
    };
}

function drafts(state = {}, action) { // eslint-disable-line complexity
    switch (action.type) {
    case ViewTypes.POST_DRAFT_CHANGED:
        return handlePostDraftChanged(state, action);
    case ViewTypes.SET_POST_DRAFT:
        return handleSetPostDraft(state, action);
    case ChannelTypes.SELECT_CHANNEL:
        return handleSelectChannel(state, action);
    case ViewTypes.SET_TEMP_UPLOAD_FILES_FOR_POST_DRAFT:
        return handleSetTempUploadFileForPostDraft(state, action);
    case ViewTypes.RETRY_UPLOAD_FILE_FOR_POST:
        return handleRetryUploadFileForPost(state, action);
    case FileTypes.RECEIVED_UPLOAD_FILES:
        return handleReceivedUploadFiles(state, action);
    case FileTypes.UPLOAD_FILES_FAILURE:
        return handleUploadFilesFailure(state, action);
    case ViewTypes.CLEAR_FILES_FOR_POST_DRAFT:
        return handleClearFilesForPostDraft(state, action);
    case ViewTypes.CLEAR_FAILED_FILES_FOR_POST_DRAFT:
        return handleRemoveFailedFilesFromPostDraft(state, action);
    case ViewTypes.REMOVE_FILE_FROM_POST_DRAFT:
        return handleRemoveFileFromPostDraft(state, action);
    case ViewTypes.REMOVE_LAST_FILE_FROM_POST_DRAFT:
        return handleRemoveLastFileFromPostDraft(state, action);
    default:
        return state;
    }
}

function loading(state = false, action) {
    switch (action.type) {
    case ViewTypes.SET_CHANNEL_LOADER:
        return action.loading;
    default:
        return state;
    }
}

function refreshing(state = false, action) {
    switch (action.type) {
    case ViewTypes.SET_CHANNEL_REFRESHING:
        return action.loading;
    default:
        return state;
    }
}

function retryFailed(state = false, action) {
    switch (action.type) {
    case ViewTypes.SET_CHANNEL_RETRY_FAILED:
        return action.failed;
    case PostTypes.GET_POSTS_SUCCESS:
    case PostTypes.GET_POSTS_SINCE_SUCCESS: {
        if (state) {
            return false;
        }

        return state;
    }
    default:
        return state;
    }
}

function postVisibility(state = {}, action) {
    switch (action.type) {
    case ViewTypes.SET_INITIAL_POST_VISIBILITY: {
        const nextState = {...state};
        nextState[action.data] = ViewTypes.POST_VISIBILITY_CHUNK_SIZE;
        return nextState;
    }
    case ViewTypes.INCREASE_POST_VISIBILITY: {
        const nextState = {...state};
        nextState[action.data] += action.amount;
        return nextState;
    }
    case ViewTypes.RECEIVED_FOCUSED_POST: {
        const nextState = {...state};
        nextState[action.channelId] = ViewTypes.POST_VISIBILITY_CHUNK_SIZE;
        return nextState;
    }
    default:
        return state;
    }
}

function loadingPosts(state = {}, action) {
    switch (action.type) {
    case ViewTypes.LOADING_POSTS: {
        const nextState = {...state};
        nextState[action.channelId] = action.data;
        return nextState;
    }
    default:
        return state;
    }
}

function lastGetPosts(state = {}, action) {
    switch (action.type) {
    case ViewTypes.RECEIVED_POSTS_FOR_CHANNEL_AT_TIME:
        return {
            ...state,
            [action.channelId]: action.time,
        };

    default:
        return state;
    }
}

function loadMorePostsVisible(state = true, action) {
    switch (action.type) {
    case ViewTypes.SET_LOAD_MORE_POSTS_VISIBLE:
        return action.data;

    default:
        return state;
    }
}

export default combineReducers({
    displayName,
    drafts,
    loading,
    refreshing,
    postVisibility,
    loadingPosts,
    lastGetPosts,
    retryFailed,
    loadMorePostsVisible,
});

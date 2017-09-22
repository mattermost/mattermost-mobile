// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';
import {
    ChannelTypes,
    FileTypes,
    PostTypes
} from 'mattermost-redux/action_types';

import {ViewTypes} from 'app/constants';

function displayName(state = '', action) {
    switch (action.type) {
    case ViewTypes.SET_CHANNEL_DISPLAY_NAME:
        return action.displayName;
    default:
        return state;
    }
}

function drafts(state = {}, action) {
    switch (action.type) {
    case ViewTypes.POST_DRAFT_CHANGED: {
        return {
            ...state,
            [action.channelId]: Object.assign({}, state[action.channelId], {draft: action.postDraft})
        };
    }
    case ViewTypes.SET_POST_DRAFT: {
        return {
            ...state,
            [action.channelId]: {
                draft: action.postDraft,
                files: action.files
            }
        };
    }
    case ChannelTypes.SELECT_CHANNEL: {
        let data = {...state};
        if (action.data && !data[action.data]) {
            data = {
                ...state,
                [action.data]: {
                    draft: '',
                    files: []
                }
            };
        }

        return data;
    }
    case ViewTypes.SET_TEMP_UPLOAD_FILES_FOR_POST_DRAFT: {
        if (action.rootId) {
            return state;
        }

        const tempFiles = action.clientIds.map((temp) => ({...temp, loading: true}));
        const files = [
            ...state[action.channelId].files,
            ...tempFiles
        ];

        return {
            ...state,
            [action.channelId]: Object.assign({}, state[action.channelId], {files})
        };
    }
    case ViewTypes.RETRY_UPLOAD_FILE_FOR_POST: {
        if (action.rootId) {
            return state;
        }

        const files = state[action.channelId].files.map((f) => {
            if (f.clientId === action.clientId) {
                return {
                    ...f,
                    loading: true,
                    failed: false
                };
            }

            return f;
        });

        return {
            ...state,
            [action.channelId]: Object.assign({}, state[action.channelId], {files})
        };
    }
    case FileTypes.RECEIVED_UPLOAD_FILES: {
        if (action.rootId || !state[action.channelId].files) {
            return state;
        }

        // Reconcile tempFiles with the received uploaded files
        const files = state[action.channelId].files.map((tempFile) => {
            const file = action.data.find((f) => f.clientId === tempFile.clientId);
            if (file) {
                return {
                    ...file,
                    localPath: tempFile.localPath
                };
            }

            return tempFile;
        });

        return {
            ...state,
            [action.channelId]: Object.assign({}, state[action.channelId], {files})
        };
    }
    case FileTypes.UPLOAD_FILES_FAILURE: {
        if (action.rootId) {
            return state;
        }

        const clientIds = action.clientIds;
        const files = state[action.channelId].files.map((tempFile) => {
            if (clientIds.includes(tempFile.clientId)) {
                return {
                    ...tempFile,
                    loading: false,
                    failed: true
                };
            }

            return tempFile;
        });

        return {
            ...state,
            [action.channelId]: Object.assign({}, state[action.channelId], {files})
        };
    }
    case ViewTypes.CLEAR_FILES_FOR_POST_DRAFT: {
        if (action.rootId) {
            return state;
        }

        return {
            ...state,
            [action.channelId]: Object.assign({}, state[action.channelId], {files: []})
        };
    }
    case ViewTypes.REMOVE_FILE_FROM_POST_DRAFT: {
        if (action.rootId) {
            return state;
        }

        const files = state[action.channelId].files.filter((file) => (file.clientId !== action.clientId));

        return {
            ...state,
            [action.channelId]: Object.assign({}, state[action.channelId], {files})
        };
    }
    case ViewTypes.REMOVE_LAST_FILE_FROM_POST_DRAFT: {
        if (action.rootId) {
            return state;
        }

        const files = [...state[action.channelId].files];
        files.splice(-1);

        return {
            ...state,
            [action.channelId]: Object.assign({}, state[action.channelId], {files})
        };
    }
    default:
        return state;
    }
}

function loading(state = false, action) {
    switch (action.type) {
    case ChannelTypes.SELECT_CHANNEL:
        return false;
    case ViewTypes.SET_CHANNEL_LOADER:
        return action.loading;
    default:
        return state;
    }
}

function refreshing(state = false, action) {
    switch (action.type) {
    case PostTypes.GET_POSTS_SUCCESS:
    case PostTypes.GET_POSTS_FAILURE:
        return false;
    case ViewTypes.SET_CHANNEL_REFRESHING:
        return action.loading;
    default:
        return state;
    }
}

function tooltipVisible(state = false, action) {
    switch (action.type) {
    case ViewTypes.POST_TOOLTIP_VISIBLE:
        return action.visible;
    default:
        return state;
    }
}

function postVisibility(state = {}, action) {
    switch (action.type) {
    case ChannelTypes.SELECT_CHANNEL: {
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
    case PostTypes.RECEIVED_POST: {
        if (action.data && state[action.data.channel_id]) {
            const nextState = {...state};
            nextState[action.data.channel_id] += 1;
            return nextState;
        }
        return state;
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

export default combineReducers({
    displayName,
    drafts,
    loading,
    refreshing,
    tooltipVisible,
    postVisibility,
    loadingPosts
});

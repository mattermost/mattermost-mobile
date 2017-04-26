// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';
import {ChannelTypes, FileTypes, UserTypes} from 'mattermost-redux/action_types';

import {ViewTypes} from 'app/constants';

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

function appInitializing(state = true, action) {
    switch (action.type) {
    case ViewTypes.APPLICATION_INITIALIZED:
        return false;
    case UserTypes.RESET_LOGOUT_STATE:
        return true;
    default:
        return state;
    }
}

export default combineReducers({
    appInitializing,
    drafts,
    loading
});

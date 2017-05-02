// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';
import {FileTypes, PostTypes} from 'mattermost-redux/action_types';

import {ViewTypes} from 'app/constants';

function drafts(state = {}, action) {
    switch (action.type) {
    case ViewTypes.COMMENT_DRAFT_CHANGED:
        return {
            ...state,
            [action.rootId]: Object.assign({}, state[action.rootId], {draft: action.draft})
        };
    case ViewTypes.SET_COMMENT_DRAFT:
        return {
            ...state,
            [action.rootId]: {
                draft: action.draft,
                files: action.files
            }
        };
    case PostTypes.RECEIVED_POST_SELECTED: {
        let data = {...state};

        if (!data[action.data]) {
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
        if (!action.rootId) {
            return state;
        }

        const tempFiles = action.clientIds.map((temp) => ({...temp, loading: true}));
        const files = [
            ...state[action.rootId].files,
            ...tempFiles
        ];

        return {
            ...state,
            [action.rootId]: Object.assign({}, state[action.rootId], {files})
        };
    }
    case ViewTypes.RETRY_UPLOAD_FILE_FOR_POST: {
        if (!action.rootId) {
            return state;
        }

        const files = state[action.rootId].files.map((f) => {
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
            [action.rootId]: Object.assign({}, state[action.rootId], {files})
        };
    }
    case FileTypes.RECEIVED_UPLOAD_FILES: {
        if (!action.rootId) {
            return state;
        }

        // Reconcile tempFiles with the received uploaded files
        const files = state[action.rootId].files.map((tempFile) => {
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
            [action.rootId]: Object.assign({}, state[action.rootId], {files})
        };
    }
    case FileTypes.UPLOAD_FILES_FAILURE: {
        if (!action.rootId) {
            return state;
        }

        const clientIds = action.clientIds;
        const files = state[action.rootId].files.map((tempFile) => {
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
            [action.rootId]: Object.assign({}, state[action.rootId], {files})
        };
    }
    case ViewTypes.CLEAR_FILES_FOR_POST_DRAFT: {
        if (!action.rootId) {
            return state;
        }

        return {
            ...state,
            [action.rootId]: Object.assign({}, state[action.rootId], {files: []})
        };
    }
    case ViewTypes.REMOVE_FILE_FROM_POST_DRAFT: {
        if (!action.rootId) {
            return state;
        }

        const files = state[action.rootId].files.filter((file) => (file.clientId !== action.clientId));

        return {
            ...state,
            [action.rootId]: Object.assign({}, state[action.rootId], {files})
        };
    }
    case ViewTypes.REMOVE_LAST_FILE_FROM_POST_DRAFT: {
        if (!action.rootId) {
            return state;
        }

        const files = [...state[action.rootId].files];
        files.splice(-1);

        return {
            ...state,
            [action.rootId]: Object.assign({}, state[action.rootId], {files})
        };
    }
    default:
        return state;
    }
}

export default combineReducers({
    drafts
});

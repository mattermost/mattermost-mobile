// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';
import {ChannelTypes, FilesTypes} from 'mattermost-redux/constants';

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
    case FilesTypes.RECEIVED_UPLOAD_FILES: {
        if (action.rootId) {
            return state;
        }

        const files = [
            ...state[action.channelId].files,
            ...action.data
        ];

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

        const files = state[action.channelId].files.filter((file) => file.id !== action.fileId);

        return {
            ...state,
            [action.channelId]: Object.assign({}, state[action.channelId], {files})
        };
    }
    default:
        return state;
    }
}

export default combineReducers({
    drafts
});

// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {AsyncStorage} from 'react-native';
import {batchActions} from 'redux-batched-actions';

import {ViewTypes} from 'app/constants';
import {ChannelTypes, GeneralTypes, TeamsTypes, UsersTypes} from 'service/constants';

export function loadStorage() {
    return async (dispatch, getState) => {
        try {
            const data = JSON.parse(await AsyncStorage.getItem('storage'));

            const {token, url, serverVersion, currentTeamId, ...otherStorage} = data;
            const credentials = {token, url};

            const currentChannelId = otherStorage[currentTeamId] ? otherStorage[currentTeamId].currentChannelId : '';

            const actions = [
                {type: GeneralTypes.RECEIVED_APP_CREDENTIALS, data: credentials},
                {type: GeneralTypes.RECEIVED_SERVER_VERSION, data: serverVersion},
                {type: TeamsTypes.SELECT_TEAM, data: currentTeamId},
                {type: ChannelTypes.SELECT_CHANNEL, data: currentChannelId}
            ];

            // Load post drafts if there are any
            if (otherStorage.postDrafts) {
                Object.keys(otherStorage.postDrafts).forEach((d) => {
                    actions.push({
                        type: ViewTypes.POST_DRAFT_CHANGED,
                        channelId: d,
                        postDraft: otherStorage.postDrafts[d]
                    });
                });
            }

            // Load thread drafts if there are any
            if (otherStorage.threadDrafts) {
                Object.keys(otherStorage.threadDrafts).forEach((d) => {
                    actions.push({
                        type: ViewTypes.COMMENT_DRAFT_CHANGED,
                        rootId: d,
                        draft: otherStorage.threadDrafts[d]
                    });
                });
            }

            dispatch(batchActions(actions), getState);
        } catch (error) {
            // Error loading data
            dispatch({type: GeneralTypes.REMOVED_APP_CREDENTIALS, error}, getState);
        }
    };
}

export function flushToStorage() {
    return async (dispatch, getState) => {
        const state = getState();

        // Can add other important items here.
        const postDrafts = state.views.channel.drafts;
        const threadDrafts = state.views.thread.draft;

        await updateStorage(null, {postDrafts, threadDrafts});
    };
}

// Passing in a blank key of null or '' merges the data into the current storage.
// Could maybe use some rework
export async function updateStorage(key, data) {
    try {
        const currentStorage = JSON.parse(await AsyncStorage.getItem('storage'));

        let mergedData;
        if (key !== null && key.length > 0) {
            const keyData = currentStorage[key];
            if (typeof data === 'string') {
                mergedData = Object.assign({}, {[key]: data});
            } else if (typeof data === 'object') {
                mergedData = Object.assign({}, {[key]: {...keyData, ...data}});
            }
        } else {
            mergedData = data;
        }

        const mergedStorageData = Object.assign({}, currentStorage, mergedData);

        await saveStorage(mergedStorageData);

        return mergedStorageData;
    } catch (error) {
        // TODO: Need to handle this error
        return null;
    }
}

async function saveStorage(data) {
    try {
        await AsyncStorage.setItem('storage', JSON.stringify(data));
    } catch (error) {
        throw error;
    }
}

export function removeStorage() {
    return async (dispatch, getState) => {
        try {
            // Keep the server Url if we have it
            const {url} = JSON.parse(await AsyncStorage.getItem('storage'));
            if (url) {
                await saveStorage({url});
            } else {
                await AsyncStorage.removeItem('storage');
            }
        } catch (error) {
            // TODO: Error removing data
        }
        dispatch({type: UsersTypes.RESET_LOGOUT_STATE}, getState);
    };
}

export default {
    loadStorage,
    removeStorage,
    updateStorage
};

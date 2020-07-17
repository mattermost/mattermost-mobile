// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineReducers} from 'redux';

import Config from '@assets/config.json';

import {ViewTypes} from 'app/constants';

const deleteUrlFromHistory = (url, serverHist) => {
    let newServerHistory = [...serverHist];
    newServerHistory = newServerHistory.filter((recentUrl) => recentUrl !== url);
    return newServerHistory;
};

const addUrlToHistory = (url, serverHist) => {
    let newServerHistory = [...serverHist];
    newServerHistory = newServerHistory.filter((recentUrl) => recentUrl !== url);

    if (newServerHistory.length >= 10) {
        newServerHistory.pop();
    }

    newServerHistory.unshift(url);

    return newServerHistory;
};

function serverUrl(state = Config.DefaultServerUrl, action) {
    switch (action.type) {
    case ViewTypes.SERVER_URL_CHANGED:
        return action.serverUrl;

    default:
        return state;
    }
}

function serverHistory(state = [], action) {
    // console.log('Reduxer', state, action);
    switch (action.type) {
    case ViewTypes.SERVER_URL_SUCCESSFULLY_CONNECTED:
        return addUrlToHistory(action.serverUrl, state);
    case ViewTypes.DELETE_SERVER_URL:
        return deleteUrlFromHistory(action.serverUrl, state);

    default:
        return state;
    }
}

export default combineReducers({
    serverUrl,
    serverHistory,
});

// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {applyMiddleware, createStore, combineReducers} from 'redux';
import {enableBatching} from 'redux-batched-actions';
import serviceReducer from 'service/reducers';
import appReducer from 'app/reducers';
import thunk from 'redux-thunk';

export default function configureStore(preloadedState) {
    return createStore(
        enableBatching(combineReducers({serviceReducer, appReducer})),
        preloadedState,
        applyMiddleware(thunk)
    );
}

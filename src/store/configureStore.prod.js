// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {applyMiddleware, createStore} from 'redux';
import {enableBatching} from 'redux-batched-actions';
import rootReducer from 'reducers/index.js';
import thunk from 'redux-thunk';

export default function configureStore(preloadedState) {
    return createStore(
        enableBatching(rootReducer),
        preloadedState,
        applyMiddleware(thunk)
    );
}

// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {applyMiddleware, compose, createStore, combineReducers} from 'redux';
import devTools from 'remote-redux-devtools';
import {enableBatching} from 'redux-batched-actions';
import serviceReducer from 'service/reducers';
import thunk from 'redux-thunk';

export default function configureServiceStore(preloadedState, appReducer, getAppReducer) {
    const store = createStore(
        enableBatching(combineReducers(Object.assign({}, serviceReducer, appReducer))),
        preloadedState,
        compose(
            applyMiddleware(thunk),
            devTools({
                name: 'Mattermost',
                hostname: 'localhost',
                port: 5678
            })
        )
    );

    if (module.hot) {
        // Enable Webpack hot module replacement for reducers
        module.hot.accept(() => {
            const nextServiceReducer = require('../reducers').default; // eslint-disable-line global-require
            let nextAppReducer;
            if (getAppReducer) {
                nextAppReducer = getAppReducer(); // eslint-disable-line global-require
            }
            store.replaceReducer(combineReducers(Object.assign({}, nextServiceReducer, nextAppReducer)));
        });
    }

    return store;
}

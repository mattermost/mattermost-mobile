// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {applyMiddleware, compose, createStore, combineReducers} from 'redux';
import {enableBatching} from 'redux-batched-actions';
import devTools from 'remote-redux-devtools';
import thunk from 'redux-thunk';

import serviceReducer from 'service/reducers';
import deepFreezeAndThrowOnMutation from 'service/utils/deep_freeze';

export default function configureServiceStore(preloadedState, appReducer, getAppReducer) {
    const store = createStore(
        createReducer(serviceReducer, appReducer),
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
            store.replaceReducer(createReducer(nextServiceReducer, nextAppReducer));
        });
    }

    return store;
}

function createReducer(...reducers) {
    const baseReducer = combineReducers(Object.assign({}, ...reducers));

    return enableFreezing(enableBatching(baseReducer));
}

function enableFreezing(reducer) {
    return (state, action) => {
        const nextState = reducer(state, action);

        if (nextState !== state) {
            deepFreezeAndThrowOnMutation(nextState);
        }

        return nextState;
    };
}

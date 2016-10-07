// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {applyMiddleware, compose, createStore} from 'redux';
import devTools from 'remote-redux-devtools';
import rootReducer from 'reducers/index.js';
import thunk from 'redux-thunk';

export default function configureStore(preloadedState) {
    const store = createStore(
        rootReducer,
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
            const nextRootReducer = require('reducers/index.js').default; // eslint-disable-line global-require
            store.replaceReducer(nextRootReducer);
        });
    }

    // If you have other enhancers & middlewares
    // update the store after creating / changing to allow devTools to use them
    devTools.updateStore(store);

    return store;
}
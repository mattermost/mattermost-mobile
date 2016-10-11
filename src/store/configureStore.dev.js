// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {applyMiddleware, createStore} from 'redux';
import {composeWithDevTools} from 'remote-redux-devtools';
import rootReducer from 'reducers/index.js';
import thunk from 'redux-thunk';

export default function configureStore(preloadedState) {
    const store = createStore(
        rootReducer,
        preloadedState,
        composeWithDevTools({
            name: 'Mattermost',
            hostname: 'localhost',
            port: 5678
        })(
            applyMiddleware(thunk)
        )
    );

    if (module.hot) {
        // Enable Webpack hot module replacement for reducers
        module.hot.accept(() => {
            const nextRootReducer = require('../reducers/index.js').default; // eslint-disable-line global-require
            store.replaceReducer(nextRootReducer);
        });
    }

    return store;
}
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-undefined */
import * as redux from 'redux';
import {persistReducer, persistStore} from 'redux-persist';
import devTools from 'remote-redux-devtools';

import {General} from '@mm-redux/constants';
import {Reducer, Action} from '@mm-redux/types/actions';
import {GlobalState} from '@mm-redux/types/store';
import {getConfig} from '@mm-redux/selectors/entities/general';
import deepFreezeAndThrowOnMutation from '@mm-redux/utils/deep_freeze';

import {getSiteUrl, setSiteUrl} from '@utils/image_cache_manager';

import serviceReducer from '../reducers';
import reducerRegistry from './reducer_registry';
import initialState from './initial_state';
import {createReducer} from './helpers';
import {createMiddleware} from './middleware';

const globalAny = global as any;
const window = globalAny.window;

const devToolsEnhancer = typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION__ ? // eslint-disable-line no-underscore-dangle
    window.__REDUX_DEVTOOLS_EXTENSION__() : // eslint-disable-line no-underscore-dangle
    () => {
        return devTools({
            name: 'Mattermost',
            hostname: 'localhost',
            port: 5678,
            realtime: true,
        });
    };

/**
 * Configures and constructs the redux store. Accepts the following parameters:
 * preloadedState - Any preloaded state to be applied to the store after it is initially configured.
 * appReducer - An object containing any app-specific reducer functions that the client needs.
 * persistConfig - Configuration for redux-persist.
 * getAppReducer - A function that returns the appReducer as defined above. Only used in development to enable hot reloading.
 * clientOptions - An object containing additional options used when configuring the redux store. The following options are available:
 *     additionalMiddleware - func | array - Allows for single or multiple additional middleware functions to be passed in from the client side.
 *     enableBuffer - bool - default = true - If true, the store will buffer all actions until offline state rehydration occurs.
 *     enableThunk - bool - default = true - If true, include the thunk middleware automatically. If false, thunk must be provided as part of additionalMiddleware.
 */
export default function configureServiceStore(preloadedState: any, appReducer: any, persistConfig: any, getAppReducer: any, clientOptions: any) {
    const baseState = Object.assign({}, initialState, preloadedState);

    const rootReducer = createReducer(serviceReducer as any, appReducer);
    const persistedReducer = persistReducer(persistConfig, rootReducer);

    const enhancers = [
        redux.applyMiddleware(...createMiddleware(clientOptions)),
    ];
    if (process.env.NODE_ENV !== 'test') { //eslint-disable-line no-process-env
        enhancers.push(devToolsEnhancer());
    }

    const store = redux.createStore(
        persistedReducer,
        baseState,
        redux.compose(...enhancers),
    );

    reducerRegistry.setChangeListener((reducers: any) => {
        store.replaceReducer(createDevReducer(baseState, reducers));
    });

    const persistor = persistStore(store, null, () => {
        store.dispatch({
            type: General.STORE_REHYDRATION_COMPLETE,
        });

        store.subscribe(async () => {
            const state = store.getState();
            const config = getConfig(state as any);

            if (getSiteUrl() !== config?.SiteURL) {
                setSiteUrl(config.SiteURL);
            }
        });
    });

    if ((module as any).hot) {
        // Enable Webpack hot module replacement for reducers
        (module as any).hot.accept(() => {
            const nextServiceReducer = require('../reducers').default; // eslint-disable-line global-require
            let nextAppReducer;
            if (getAppReducer) {
                nextAppReducer = getAppReducer(); // eslint-disable-line global-require
            }
            store.replaceReducer(createDevReducer(baseState, reducerRegistry.getReducers(), nextServiceReducer, nextAppReducer));
        });
    }

    return {store, persistor};
}

function createDevReducer(baseState: any, ...reducers: any) {
    return enableFreezing(createReducer(baseState, ...reducers));
}

function enableFreezing(reducer: Reducer) {
    return (state: GlobalState, action: Action) => {
        const nextState = reducer(state, action);

        if (nextState !== state) {
            deepFreezeAndThrowOnMutation(nextState);
        }

        return nextState;
    };
}

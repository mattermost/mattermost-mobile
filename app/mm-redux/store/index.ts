// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as redux from 'redux';
import {persistReducer, persistStore, Persistor, createPersistoid} from 'redux-persist';
import AsyncStorage from '@react-native-community/async-storage';

import {General} from '@mm-redux/constants';
import serviceReducer from '@mm-redux/reducers';

import {createReducer, getStoredState} from './helpers';
import initialState from './initial_state';
import {createMiddleware} from './middleware';
import reducerRegistry from './reducer_registry';

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

type ReduxStore = {
    store: redux.Store;
    persistor: Persistor;
}

type ClientOptions = {
    additionalMiddleware: [];
    enableBuffer: boolean;
    enableThunk: boolean;
    enhancers: [];
}

type V4Store = {
    storeKeys: Array<string>;
    restoredState: any;
}

const defaultClientOptions: ClientOptions = {
    additionalMiddleware: [],
    enableBuffer: true,
    enableThunk: true,
    enhancers: [],
};

export default function configureStore(preloadedState: any, appReducer: any, persistConfig: any, clientOptions: ClientOptions): ReduxStore {
    const baseState = Object.assign({}, initialState, preloadedState);
    const rootReducer = createReducer(serviceReducer as any, appReducer);
    const persistedReducer = persistReducer({...persistConfig}, rootReducer);
    const options = Object.assign({}, defaultClientOptions, clientOptions);

    const store = redux.createStore(
        persistedReducer,
        baseState,
        redux.compose(
            redux.applyMiddleware(
                ...createMiddleware(options),
            ),
            ...options.enhancers,
        ),
    );

    reducerRegistry.setChangeListener((reducers: any) => {
        const reducer = persistReducer(persistConfig, createReducer(baseState, reducers));

        store.replaceReducer(reducer);
    });

    const persistor = persistStore(store, null);

    getStoredState().then(({storeKeys, restoredState}: V4Store) => {
        if (Object.keys(restoredState).length) {
            const state = {
                ...restoredState,
                views: {
                    ...restoredState.views,
                    root: {
                        hydrationComplete: true,
                    },
                },
                _persist: persistor.getState(),
            };

            store.dispatch({
                type: General.OFFLINE_STORE_PURGE,
                state,
            });

            console.log('HYDRATED FROM v4', storeKeys); // eslint-disable-line no-console
            const persistoid = createPersistoid(persistConfig);
            store.subscribe(() => {
                persistoid.update(store.getState());
            });
            store.dispatch({type: General.REHYDRATED});
            AsyncStorage.multiRemove(storeKeys);
        } else {
            store.dispatch({type: General.REHYDRATED});
        }
    });

    return {store, persistor};
}

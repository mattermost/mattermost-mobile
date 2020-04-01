// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as redux from 'redux';
import {persistReducer, persistStore} from 'redux-persist';

import {General} from '@mm-redux/constants';
import {getConfig} from '@mm-redux/selectors/entities/general';
import {getSiteUrl, setSiteUrl} from '@utils/image_cache_manager';

import serviceReducer from '../reducers';
import reducerRegistry from './reducer_registry';
import {createReducer} from './helpers';
import initialState from './initial_state';
import {createMiddleware} from './middleware';

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
export default function configureOfflineServiceStore(preloadedState: any, appReducer: any, persistConfig: any, getAppReducer: any, clientOptions = {}) {
    const baseState = Object.assign({}, initialState, preloadedState);

    const rootReducer = createReducer(serviceReducer as any, appReducer);
    const persistedReducer = persistReducer(persistConfig, rootReducer);

    const store = redux.createStore(
        persistedReducer,
        baseState,
        redux.applyMiddleware(
            ...createMiddleware(clientOptions),
        ),
    );

    reducerRegistry.setChangeListener((reducers: any) => {
        const reducer = persistReducer(persistConfig, createReducer(baseState, reducers));

        store.replaceReducer(reducer);
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

    return {store, persistor};
}

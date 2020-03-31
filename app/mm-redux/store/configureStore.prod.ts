// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as redux from 'redux';
import reducerRegistry from './reducer_registry';

import serviceReducer from '../reducers';

import {offlineConfig, createReducer} from './helpers';
import initialState from './initial_state';
import {createMiddleware} from './middleware';

import {createOfflineReducer, networkStatusChangedAction, offlineCompose} from 'redux-offline';
import defaultOfflineConfig from 'redux-offline/lib/defaults';

/**
 * Configures and constructs the redux store. Accepts the following parameters:
 * preloadedState - Any preloaded state to be applied to the store after it is initially configured.
 * appReducer - An object containing any app-specific reducer functions that the client needs.
 * userOfflineConfig - Any additional configuration data to be passed into redux-offline aside from the default values.
 * getAppReducer - A function that returns the appReducer as defined above. Only used in development to enable hot reloading.
 * clientOptions - An object containing additional options used when configuring the redux store. The following options are available:
 *     additionalMiddleware - func | array - Allows for single or multiple additional middleware functions to be passed in from the client side.
 *     enableBuffer - bool - default = true - If true, the store will buffer all actions until offline state rehydration occurs.
 *     enableThunk - bool - default = true - If true, include the thunk middleware automatically. If false, thunk must be provided as part of additionalMiddleware.
 */
export default function configureOfflineServiceStore(preloadedState: any, appReducer: any, userOfflineConfig: any, getAppReducer: any, clientOptions = {}) {
    const baseState = Object.assign({}, initialState, preloadedState);

    const baseOfflineConfig = Object.assign({}, defaultOfflineConfig, offlineConfig, userOfflineConfig);

    const store = redux.createStore(
        createOfflineReducer(createReducer(baseState, serviceReducer as any, appReducer)),
        baseState,
        offlineCompose(baseOfflineConfig)(
            createMiddleware(clientOptions),
            [],
        ),
    );

    reducerRegistry.setChangeListener((reducers: any) => {
        store.replaceReducer(createOfflineReducer(createReducer(baseState, reducers)));
    });

    // launch store persistor
    if (baseOfflineConfig.persist) {
        baseOfflineConfig.persist(store, baseOfflineConfig.persistOptions, baseOfflineConfig.persistCallback);
    }

    if (baseOfflineConfig.detectNetwork) {
        baseOfflineConfig.detectNetwork((online: boolean) => {
            store.dispatch(networkStatusChangedAction(online));
        });
    }

    return store;
}

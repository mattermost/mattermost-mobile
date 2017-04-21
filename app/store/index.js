// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {batchActions} from 'redux-batched-actions';
import {AsyncStorage} from 'react-native';
import configureStore from 'mattermost-redux/store';
import {Constants, RequestStatus} from 'mattermost-redux/constants';
import {createBlacklistFilter} from 'redux-persist-transform-filter';
import {createTransform, persistStore} from 'redux-persist';

import {ViewTypes} from 'app/constants';
import appReducer from 'app/reducers';

import {transformSet} from './utils';

function getAppReducer() {
    return require('../../app/reducers'); // eslint-disable-line global-require
}

const usersSetTransform = [
    'profilesInChannel',
    'profilesNotInChannel',
    'profilesInTeam'
];

const teamSetTransform = [
    'membersInTeam'
];

const setTransforms = [
    ...usersSetTransform,
    ...teamSetTransform
];

export default function configureAppStore(initialState) {
    const viewsBlackListFilter = createBlacklistFilter(
        'views',
        ['login']
    );

    const setTransformer = createTransform(
        (inboundState, key) => {
            if (key === 'entities') {
                const state = {...inboundState};
                for (const prop in state) {
                    if (state.hasOwnProperty(prop)) {
                        state[prop] = transformSet(state[prop], setTransforms);
                    }
                }

                return state;
            }

            return inboundState;
        },
        (outboundState, key) => {
            if (key === 'entities') {
                const state = {...outboundState};
                for (const prop in state) {
                    if (state.hasOwnProperty(prop)) {
                        state[prop] = transformSet(state[prop], setTransforms, false);
                    }
                }

                return state;
            }

            return outboundState;
        }
    );

    const offlineOptions = {
        persist: (store, options) => {
            const persistor = persistStore(store, {storage: AsyncStorage, ...options}, () => {
                store.dispatch({
                    type: Constants.STORE_REHYDRATION_COMPLETE,
                    complete: true
                });
            });

            let purging = false;

            // check to see if the logout request was successful
            store.subscribe(async () => {
                const state = store.getState();
                if ((state.requests.users.logout.status === RequestStatus.SUCCESS || state.requests.users.logout.status === RequestStatus.FAILURE) && !purging) {
                    purging = true;

                    await persistor.purge();

                    store.dispatch(batchActions([
                        {
                            type: Constants.OFFLINE_STORE_RESET,
                            data: initialState
                        },
                        {
                            type: ViewTypes.SERVER_URL_CHANGED,
                            serverUrl: state.entities.general.credentials.url || state.views.selectServer.serverUrl
                        }
                    ]));

                    setTimeout(() => {
                        purging = false;
                    }, 500);
                }
            });

            return persistor;
        },
        persistOptions: {
            autoRehydrate: {
                log: false
            },
            blacklist: ['errors', 'navigation', 'offline', 'requests'],
            debounce: 500,
            transforms: [
                setTransformer,
                viewsBlackListFilter
            ]
        }
    };

    return configureStore({}, appReducer, offlineOptions, getAppReducer);
}

// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {AsyncStorage} from 'react-native';
import {configureOfflineServiceStore} from 'mattermost-redux/store';
import {Constants, RequestStatus} from 'mattermost-redux/constants';
import {createBlacklistFilter} from 'redux-persist-transform-filter';
import {createTransform, persistStore} from 'redux-persist';

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

export default function configureStore(initialState) {
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

            // check to see if the logout request was successful
            store.subscribe(() => {
                const state = store.getState();
                if (state.requests.users.logout.status === RequestStatus.SUCCESS) {
                    persistor.purge();
                    store.dispatch({
                        type: Constants.OFFLINE_STORE_RESET,
                        data: initialState
                    });
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

    return configureOfflineServiceStore(appReducer, offlineOptions, getAppReducer);
}

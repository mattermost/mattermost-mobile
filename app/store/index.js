// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {batchActions} from 'redux-batched-actions';
import {AsyncStorage} from 'react-native';
import {createBlacklistFilter} from 'redux-persist-transform-filter';
import {createTransform, persistStore} from 'redux-persist';

import {ErrorTypes, GeneralTypes} from 'mattermost-redux/action_types';
import {General, RequestStatus} from 'mattermost-redux/constants';
import configureStore from 'mattermost-redux/store';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {NavigationTypes, ViewTypes} from 'app/constants';
import appReducer from 'app/reducers';

import {transformSet} from './utils';

function getAppReducer() {
    return require('../../app/reducers'); // eslint-disable-line global-require
}

const usersSetTransform = [
    'profilesInChannel',
    'profilesNotInChannel',
    'profilesInTeam',
    'profilesNotInTeam'
];

const channelSetTransform = [
    'channelsInTeam'
];

const setTransforms = [
    ...usersSetTransform,
    ...channelSetTransform
];

export default function configureAppStore(initialState) {
    const viewsBlackListFilter = createBlacklistFilter(
        'views',
        ['login', 'root']
    );

    const typingBlackListFilter = createBlacklistFilter(
        'entities',
        ['typing']
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
                    type: General.STORE_REHYDRATION_COMPLETE,
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
                            type: General.OFFLINE_STORE_RESET,
                            data: initialState
                        },
                        {
                            type: ViewTypes.SERVER_URL_CHANGED,
                            serverUrl: state.entities.general.credentials.url || state.views.selectServer.serverUrl
                        },
                        {
                            type: GeneralTypes.RECEIVED_APP_DEVICE_TOKEN,
                            data: state.entities.general.deviceToken
                        }
                    ]));

                    setTimeout(() => {
                        purging = false;
                    }, 500);
                } else if (state.views.root.purge && !purging) {
                    purging = true;

                    await persistor.purge();

                    store.dispatch(batchActions([
                        {
                            type: General.OFFLINE_STORE_RESET,
                            data: initialState
                        },
                        {
                            type: ErrorTypes.RESTORE_ERRORS,
                            data: [...state.errors]
                        },
                        {
                            type: GeneralTypes.RECEIVED_APP_DEVICE_TOKEN,
                            data: state.entities.general.deviceToken
                        },
                        {
                            type: GeneralTypes.RECEIVED_APP_CREDENTIALS,
                            data: {
                                url: state.entities.general.credentials.url,
                                token: state.entities.general.credentials.token
                            }
                        },
                        {
                            type: ViewTypes.SERVER_URL_CHANGED,
                            serverUrl: state.entities.general.credentials.url || state.views.selectServer.serverUrl
                        }
                    ], 'BATCH_FOR_RESTART'));

                    setTimeout(() => {
                        purging = false;
                        EventEmitter.emit(NavigationTypes.RESTART_APP);
                    }, 500);
                }
            });

            return persistor;
        },
        persistOptions: {
            autoRehydrate: {
                log: false
            },
            blacklist: ['navigation', 'offline', 'requests'],
            debounce: 500,
            transforms: [
                setTransformer,
                viewsBlackListFilter,
                typingBlackListFilter
            ]
        }
    };

    return configureStore(initialState, appReducer, offlineOptions, getAppReducer);
}

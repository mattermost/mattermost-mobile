// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {batchActions} from 'redux-batched-actions';
import {AsyncStorage, Platform} from 'react-native';
import {createBlacklistFilter} from 'redux-persist-transform-filter';
import {createTransform, persistStore} from 'redux-persist';

import {ErrorTypes, GeneralTypes} from 'mattermost-redux/action_types';
import {General, RequestStatus} from 'mattermost-redux/constants';
import configureStore from 'mattermost-redux/store';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {NavigationTypes, ViewTypes} from 'app/constants';
import appReducer from 'app/reducers';
import {throttle} from 'app/utils/general';
import networkConnectionListener from 'app/utils/network';
import {createSentryMiddleware} from 'app/utils/sentry/middleware';

import mattermostBucket from 'app/mattermost_bucket';
import Config from 'assets/config';

import {messageRetention, shareExtensionData} from './middleware';
import {transformSet} from './utils';

function getAppReducer() {
    return require('../../app/reducers'); // eslint-disable-line global-require
}

const usersSetTransform = [
    'profilesInChannel',
    'profilesNotInChannel',
    'profilesInTeam',
    'profilesNotInTeam',
];

const channelSetTransform = [
    'channelsInTeam',
];

const setTransforms = [
    ...usersSetTransform,
    ...channelSetTransform,
];

export default function configureAppStore(initialState) {
    const viewsBlackListFilter = createBlacklistFilter(
        'views',
        ['announcement', 'extension', 'login', 'root']
    );

    const typingBlackListFilter = createBlacklistFilter(
        'entities',
        ['typing']
    );

    const channelViewBlackList = {loading: true, refreshing: true, loadingPosts: true, postVisibility: true, retryFailed: true, loadMorePostsVisible: true};
    const channelViewBlackListFilter = createTransform(
        (inboundState) => {
            const channel = {};

            for (const channelKey of Object.keys(inboundState.channel)) {
                if (!channelViewBlackList[channelKey]) {
                    channel[channelKey] = inboundState.channel[channelKey];
                }
            }

            return {
                ...inboundState,
                channel,
            };
        },
        null,
        {whitelist: ['views']} // Only run this filter on the views state (or any other entry that ends up being named views)
    );

    const emojiBlackList = {nonExistentEmoji: true};
    const emojiBlackListFilter = createTransform(
        (inboundState) => {
            const emojis = {};

            for (const emojiKey of Object.keys(inboundState.emojis)) {
                if (!emojiBlackList[emojiKey]) {
                    emojis[emojiKey] = inboundState.emojis[emojiKey];
                }
            }

            return {
                ...inboundState,
                emojis,
            };
        },
        null,
        {whitelist: ['entities']} // Only run this filter on the entities state (or any other entry that ends up being named entities)
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
        effect: (effect, action) => {
            if (typeof effect !== 'function') {
                throw new Error('Offline Action: effect must be a function.');
            } else if (!action.meta.offline.commit) {
                throw new Error('Offline Action: commit action must be present.');
            }

            return effect();
        },
        detectNetwork: (callback) => networkConnectionListener(callback),
        persist: (store, options) => {
            const persistor = persistStore(store, {storage: AsyncStorage, ...options}, () => {
                store.dispatch({
                    type: General.STORE_REHYDRATION_COMPLETE,
                    complete: true,
                });
            });

            let purging = false;

            // for iOS write the entities to a shared file
            if (Platform.OS === 'ios') {
                store.subscribe(throttle(() => {
                    const state = store.getState();
                    if (state.entities) {
                        mattermostBucket.writeToFile('entities', JSON.stringify(state.entities), Config.AppGroupId);
                    }
                }, 1000));
            }

            // check to see if the logout request was successful
            store.subscribe(async () => {
                const state = store.getState();
                if ((state.requests.users.logout.status === RequestStatus.SUCCESS || state.requests.users.logout.status === RequestStatus.FAILURE) && !purging) {
                    purging = true;

                    await persistor.purge();

                    store.dispatch(batchActions([
                        {
                            type: General.OFFLINE_STORE_RESET,
                            data: initialState,
                        },
                        {
                            type: ViewTypes.SERVER_URL_CHANGED,
                            serverUrl: state.entities.general.credentials.url || state.views.selectServer.serverUrl,
                        },
                        {
                            type: GeneralTypes.RECEIVED_APP_DEVICE_TOKEN,
                            data: state.entities.general.deviceToken,
                        },
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
                            data: initialState,
                        },
                        {
                            type: ErrorTypes.RESTORE_ERRORS,
                            data: [...state.errors],
                        },
                        {
                            type: GeneralTypes.RECEIVED_APP_DEVICE_TOKEN,
                            data: state.entities.general.deviceToken,
                        },
                        {
                            type: GeneralTypes.RECEIVED_APP_CREDENTIALS,
                            data: {
                                url: state.entities.general.credentials.url,
                                token: state.entities.general.credentials.token,
                            },
                        },
                        {
                            type: ViewTypes.SERVER_URL_CHANGED,
                            serverUrl: state.entities.general.credentials.url || state.views.selectServer.serverUrl,
                        },
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
                log: false,
            },
            blacklist: ['device', 'navigation', 'offline', 'requests'],
            debounce: 500,
            transforms: [
                setTransformer,
                viewsBlackListFilter,
                typingBlackListFilter,
                channelViewBlackListFilter,
                emojiBlackListFilter,
            ],
        },
    };

    const additionalMiddleware = [createSentryMiddleware(), messageRetention, shareExtensionData];
    return configureStore(initialState, appReducer, offlineOptions, getAppReducer, {
        additionalMiddleware,
    });
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {batchActions} from 'redux-batched-actions';
import {AsyncStorage, Platform} from 'react-native';
import {createBlacklistFilter} from 'redux-persist-transform-filter';
import {createTransform, persistStore} from 'redux-persist';

import {ErrorTypes, GeneralTypes} from 'mattermost-redux/action_types';
import {General, RequestStatus} from 'mattermost-redux/constants';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import configureStore from 'mattermost-redux/store';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {NavigationTypes, ViewTypes} from 'app/constants';
import appReducer from 'app/reducers';
import {throttle} from 'app/utils/general';
import {getSiteUrl, setSiteUrl} from 'app/utils/image_cache_manager';
import {createSentryMiddleware} from 'app/utils/sentry/middleware';

import mattermostBucket from 'app/mattermost_bucket';

import {messageRetention} from './middleware';
import {createThunkMiddleware} from './thunk';
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

const rolesSetTransform = [
    'pending',
];

const setTransforms = [
    ...usersSetTransform,
    ...channelSetTransform,
    ...rolesSetTransform,
];

export default function configureAppStore(initialState) {
    const viewsBlackListFilter = createBlacklistFilter(
        'views',
        ['extension', 'login', 'root']
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
                        const channelsInTeam = {...state.entities.channels.channelsInTeam};
                        Object.keys(channelsInTeam).forEach((teamId) => {
                            channelsInTeam[teamId] = Array.from(channelsInTeam[teamId]);
                        });

                        const profilesInChannel = {...state.entities.users.profilesInChannel};
                        Object.keys(profilesInChannel).forEach((channelId) => {
                            profilesInChannel[channelId] = Array.from(profilesInChannel[channelId]);
                        });

                        const entities = {
                            ...state.entities,
                            channels: {
                                ...state.entities.channels,
                                channelsInTeam,
                            },
                            users: {
                                ...state.entities.users,
                                profilesInChannel,
                                profilesNotInTeam: [],
                                profilesWithoutTeam: [],
                                profilesNotInChannel: [],
                            },
                        };
                        mattermostBucket.writeToFile('entities', JSON.stringify(entities));
                    }
                }, 1000));
            }

            // check to see if the logout request was successful
            store.subscribe(async () => {
                const state = store.getState();
                const config = getConfig(state);

                if (getSiteUrl() !== config?.SiteURL) {
                    setSiteUrl(config.SiteURL);
                }

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

                    // When logging out remove the data stored in the bucket
                    mattermostBucket.removePreference('cert');
                    mattermostBucket.removePreference('emm');
                    mattermostBucket.removeFile('entities');
                    setSiteUrl(null);

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
                        {
                            type: GeneralTypes.RECEIVED_SERVER_VERSION,
                            data: state.entities.general.serverVersion,
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

    const clientOptions = {
        additionalMiddleware: [
            createThunkMiddleware(),
            createSentryMiddleware(),
            messageRetention,
        ],
        enableThunk: false, // We override the default thunk middleware
    };

    return configureStore(initialState, appReducer, offlineOptions, getAppReducer, clientOptions);
}

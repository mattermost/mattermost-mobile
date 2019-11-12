// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {batchActions, enableBatching} from 'redux-batched-actions';
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import {createBlacklistFilter} from 'redux-persist-transform-filter';
import {createTransform, persistStore} from 'redux-persist';
import merge from 'deepmerge';

import {ErrorTypes, GeneralTypes} from 'mattermost-redux/action_types';
import {General, RequestStatus} from 'mattermost-redux/constants';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import configureStore from 'mattermost-redux/store';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {NavigationTypes, ViewTypes} from 'app/constants';
import mattermostBucket from 'app/mattermost_bucket';
import initialState from 'app/initial_state';
import appReducer from 'app/reducers';
import {throttle} from 'app/utils/general';
import {getSiteUrl, setSiteUrl} from 'app/utils/image_cache_manager';
import {createSentryMiddleware} from 'app/utils/sentry/middleware';

import {messageRetention} from './middleware';
import {createThunkMiddleware} from './thunk';
import {transformSet} from './utils';

import {createRealmStore, applyMiddleware} from 'realm-react-redux';
import Realm from 'realm';
import thunk from 'redux-thunk';
import models from 'app/realm/models';
import writers from 'app/realm/writers';
import {removeProtocol} from 'app/utils/url';

export let reduxStore = null;

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

export function configureAppStore() {
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

                        let url;
                        if (state.entities.users.currentUserId) {
                            url = state.entities.general.credentials.url || state.views.selectServer.serverUrl;
                        }

                        const entities = {
                            ...state.entities,
                            general: {
                                credentials: {
                                    url,
                                },
                            },
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

                    const {currentTeamId} = state.entities.teams;
                    const myPreferences = {...state.entities.preferences.myPreferences};
                    Object.keys(myPreferences).forEach((key) => {
                        if (!key.startsWith('theme--')) {
                            Reflect.deleteProperty(myPreferences, key);
                        }
                    });

                    const initialStateWithTeamAndThemePreferences = merge(initialState, {
                        entities: {
                            teams: {
                                currentTeamId,
                            },
                            preferences: {
                                myPreferences,
                            },
                        },
                    });

                    store.dispatch(batchActions([
                        {
                            type: General.OFFLINE_STORE_RESET,
                            data: initialStateWithTeamAndThemePreferences,
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
                        {
                            type: General.STORE_REHYDRATION_COMPLETE,
                        },
                    ], 'BATCH_FOR_RESTART'));

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
                        {
                            type: General.STORE_REHYDRATION_COMPLETE,
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

    reduxStore = configureStore(initialState, appReducer, offlineOptions, getAppReducer, clientOptions);
    return reduxStore;
}

const schemas = [
    {schema: models, schemaVersion: 1},
];

export function configureRealmStore(path) {
    // Here we handle migrations if there are any
    const diskPath = Platform.OS === 'ios' ? `${mattermostBucket.appGroupFileStoragePath}/` : '';
    const dbPath = `${diskPath}${path ? removeProtocol(path).replace(':', '-') : 'default'}.realm`;

    let nextSchemaIndex = Realm.schemaVersion(dbPath);
    while (nextSchemaIndex > 0 && nextSchemaIndex < schemas.length) {
        const migratedRealm = new Realm(schemas[nextSchemaIndex++]);
        migratedRealm.close();
    }

    // This will create a Realm instance to use in the store, using the options
    // passed in the second argument. To pass an existing Realm instance instead
    // you can use createRealmStore(writer, { realm: yourRealmInstance })

    const current = nextSchemaIndex > 0 ? schemas[nextSchemaIndex - 1] : schemas[schemas.length - 1];

    // We set allowUnsafeWrites as true cause there seems to be a race condition and this avoids the warning
    return createRealmStore(
        enableBatching(writers),
        {path: dbPath, schema: current.schema, schemaVersion: current.schemaVersion, allowUnsafeWrites: true},
        applyMiddleware(thunk)
    );
}

export function deleteRealmStore(path) {
    const diskPath = Platform.OS === 'ios' ? `${mattermostBucket.appGroupFileStoragePath}/` : '';
    const dbPath = `${diskPath}${path ? removeProtocol(path).replace(':', '-') : 'default'}.realm`;

    Realm.deleteFile({path: dbPath});
}

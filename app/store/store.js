// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AsyncStorage from '@react-native-community/async-storage';
import {createBlacklistFilter} from 'redux-persist-transform-filter';
import {createTransform, persistStore} from 'redux-persist';

import {General} from 'mattermost-redux/constants';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import configureStore from 'mattermost-redux/store';

import initialState from 'app/initial_state';
import appReducer from 'app/reducers';
import {getSiteUrl, setSiteUrl} from 'app/utils/image_cache_manager';
import {createSentryMiddleware} from 'app/utils/sentry/middleware';

import {middlewares} from './middleware';
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

const viewsBlackListFilter = createBlacklistFilter(
    'views',
    ['extension', 'login', 'root'],
);

const typingBlackListFilter = createBlacklistFilter(
    'entities',
    ['typing'],
);

const channelViewBlackList = {loading: true, refreshing: true, loadingPosts: true, retryFailed: true, loadMorePostsVisible: true};
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
    {whitelist: ['views']}, // Only run this filter on the views state (or any other entry that ends up being named views)
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
    {whitelist: ['entities']}, // Only run this filter on the entities state (or any other entry that ends up being named entities)
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
    },
);

const persistConfig = {
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

        store.subscribe(async () => {
            const state = store.getState();
            const config = getConfig(state);

            if (getSiteUrl() !== config?.SiteURL) {
                setSiteUrl(config.SiteURL);
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

export default function configureAppStore() {
    const clientOptions = {
        additionalMiddleware: [
            createThunkMiddleware(),
            createSentryMiddleware(),
            ...middlewares(persistConfig),
        ],
        enableThunk: false, // We override the default thunk middleware
    };

    return configureStore(initialState, appReducer, persistConfig, getAppReducer, clientOptions);
}

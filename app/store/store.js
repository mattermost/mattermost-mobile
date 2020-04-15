// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createBlacklistFilter} from 'redux-persist-transform-filter';
import {createTransform} from 'redux-persist';
import reduxReset from 'redux-reset';

import {General} from '@mm-redux/constants';
import configureStore from '@mm-redux/store';
import MMKVStorageAdapter from '@mm-redux/store/mmkv_adapter';

import appReducer from 'app/reducers';
import {createSentryMiddleware} from 'app/utils/sentry/middleware';

import {middlewares} from './middleware';
import {createThunkMiddleware} from './thunk';
import {transformSet} from './utils';

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
    ['extension', 'root'],
);

const typingBlackListFilter = createBlacklistFilter(
    'entities',
    ['typing'],
);

const channelViewBlackList = {loading: true, refreshing: true, loadingPosts: true, retryFailed: true, loadMorePostsVisible: true};
const channelViewBlackListFilter = createTransform(
    (inboundState) => {
        const channel = {};
        const keys = inboundState.channel ? Object.keys(inboundState.channel) : [];

        for (const channelKey of keys) {
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
        const keys = inboundState.emojis ? Object.keys(inboundState.emojis) : [];

        for (const emojiKey of keys) {
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
    key: 'root',
    storage: MMKVStorageAdapter,
    blacklist: ['device', 'navigation', 'offline', 'requests'],
    transforms: [
        setTransformer,
        viewsBlackListFilter,
        typingBlackListFilter,
        channelViewBlackListFilter,
        emojiBlackListFilter,
    ],
};

export default function configureAppStore(initialState) {
    const clientOptions = {
        additionalMiddleware: [
            createThunkMiddleware(),
            createSentryMiddleware(),
            ...middlewares(),
        ],
        enableThunk: false, // We override the default thunk middleware
        enhancers: [reduxReset(General.OFFLINE_STORE_PURGE)],
    };

    return configureStore(initialState, appReducer, persistConfig, clientOptions);
}

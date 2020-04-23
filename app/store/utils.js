// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import merge from 'deepmerge';
import DeviceInfo from 'react-native-device-info';

function transformFromSet(incoming) {
    const state = {...incoming};

    for (const key in state) {
        if (state.hasOwnProperty(key)) {
            if (state[key] instanceof Set) {
                state[key] = Array.from([...state[key]]);
            }
        }
    }

    return state;
}

function transformToSet(incoming) {
    const state = {...incoming};

    for (const key in state) {
        if (state.hasOwnProperty(key)) {
            state[key] = new Set(state[key]);
        }
    }

    return state;
}

export function transformSet(incoming, setTransforms, toStorage = true) {
    const state = {...incoming};

    const transformer = toStorage ? transformFromSet : transformToSet;

    for (const key in state) {
        if (state.hasOwnProperty(key) && setTransforms.includes(key)) {
            state[key] = transformer(state[key]);
        }
    }

    return state;
}

export function waitForHydration(store, callback) {
    let executed = false; // this is to prevent a race condition when subcription runs before unsubscribed
    let state = store.getState();
    let root = state.views?.root;
    let persist = state._persist; //eslint-disable-line no-underscore-dangle

    if (root?.hydrationComplete && !executed) {
        if (callback && typeof callback === 'function') {
            executed = true;
            callback();
        }
    } else {
        const subscription = () => {
            state = store.getState();
            root = state.views?.root;
            persist = state._persist; //eslint-disable-line no-underscore-dangle
            if (root?.hydrationComplete && !executed) {
                unsubscribeFromStore();
                if (callback && typeof callback === 'function') {
                    executed = true;
                    callback();
                }
            }
        };

        const unsubscribeFromStore = store.subscribe(subscription);
    }
}

export function getStateForReset(initialState, currentState) {
    const {app} = currentState;
    const {currentUserId} = currentState.entities.users;
    const currentUserProfile = currentState.entities.users.profiles[currentUserId];
    const {currentTeamId} = currentState.entities.teams;
    const myPreferences = {...currentState.entities.preferences.myPreferences};
    Object.keys(myPreferences).forEach((key) => {
        if (!key.startsWith('theme--')) {
            Reflect.deleteProperty(myPreferences, key);
        }
    });

    const resetState = merge(initialState, {
        app,
        entities: {
            general: currentState.entities.general,
            users: {
                currentUserId,
                profiles: {
                    [currentUserId]: currentUserProfile,
                },
            },
            teams: {
                currentTeamId,
            },
            preferences: {
                myPreferences,
            },
        },
        errors: currentState.errors,
        views: {
            selectServer: {
                serverUrl: currentState.views?.selectServer?.serverUrl,
            },
            root: {
                hydrationComplete: true,
            },
        },
        _persist: {
            rehydrated: true,
        },
    });

    return resetState;
}

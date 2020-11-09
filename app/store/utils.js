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

export function serialize(state) {
    if (!state) {
        return state;
    }

    if (Array.isArray(state)) {
        return [...state];
    }

    return {...state};
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

    if (root?.hydrationComplete && !executed) {
        if (callback && typeof callback === 'function') {
            executed = true;
            callback();
        }
    } else {
        const subscription = () => {
            state = store.getState();
            root = state.views?.root;
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
    const preferences = currentState.entities.preferences;

    const resetState = merge(initialState, {
        app: {
            ...app,
            previousVersion: DeviceInfo.getVersion(),
        },
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
                teams: {
                    [currentTeamId]: currentState.entities.teams.teams[currentTeamId],
                },
                myMembers: {
                    [currentTeamId]: currentState.entities.teams.myMembers[currentTeamId],
                },
            },
            preferences,
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

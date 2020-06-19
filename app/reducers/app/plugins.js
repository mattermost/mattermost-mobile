// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineReducers} from 'redux';

import {ActionTypes} from '@constants/plugins';

function removePostPluginComponents(state, action) {
    if (!action.data) {
        return state;
    }

    const nextState = {...state};
    let modified = false;
    Object.keys(nextState).forEach((k) => {
        const c = nextState[k];
        if (c.pluginId === action.data.id) {
            Reflect.deleteProperty(nextState, k);
            modified = true;
        }
    });

    if (modified) {
        return nextState;
    }

    return state;
}

function removePostPluginComponent(state, action) {
    const nextState = {...state};
    const keys = Object.keys(nextState);
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (nextState[k].id === action.id) {
            Reflect.deleteProperty(nextState, k);
            return nextState;
        }
    }

    return state;
}

function plugins(state = {}, action) {
    switch (action.type) {
    case ActionTypes.RECEIVED_MOBILE_PLUGINS: {
        if (action.data) {
            const nextState = {};
            action.data.forEach((p) => {
                nextState[p.id] = p;
            });
            return nextState;
        }
        return state;
    }
    case ActionTypes.RECEIVED_MOBILE_PLUGIN: {
        if (action.data) {
            const nextState = {...state};
            nextState[action.data.id] = action.data;
            return nextState;
        }
        return state;
    }
    case ActionTypes.REMOVED_MOBILE_PLUGIN: {
        if (action.data && state[action.data.id]) {
            const nextState = {...state};
            Reflect.deleteProperty(nextState, action.data.id);
            return nextState;
        }
        return state;
    }

    default:
        return state;
    }
}

function postTypes(state = {}, action) {
    switch (action.type) {
    case ActionTypes.RECEIVED_PLUGIN_POST_COMPONENT: {
        if (action.data) {
            // Skip saving the component if one already exists and the new plugin id
            // is lower alphabetically
            const currentPost = state[action.data.type];
            if (currentPost && action.data.pluginId > currentPost.pluginId) {
                return state;
            }

            const nextState = {...state};
            nextState[action.data.type] = action.data;
            return nextState;
        }
        return state;
    }
    case ActionTypes.REMOVED_PLUGIN_POST_COMPONENT:
        return removePostPluginComponent(state, action);
    case ActionTypes.RECEIVED_MOBILE_PLUGIN:
    case ActionTypes.REMOVED_MOBILE_PLUGIN:
        return removePostPluginComponents(state, action);
    default:
        return state;
    }
}

export default combineReducers({

    // object where every key is a plugin id and values are webapp plugin manifests
    plugins,

    // object where every key is a post type and the values are components wrapped in an
    // an object that contains a plugin id
    postTypes,
});

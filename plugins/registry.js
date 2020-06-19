// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import store from '@store/store';
import {generateId} from '@utils/file';
import {ActionTypes} from '@constants/plugins';

export default class PluginRegistry {
    constructor(id) {
        this.id = id;
    }

    // Register a component to render a custom body for posts with a specific type.
    // Custom post types must be prefixed with 'custom_'.
    // Custom post types can also apply for ephemeral posts.
    // Accepts a string type and a component.
    // Returns a unique identifier.
    registerPostTypeComponent(type, component) {
        const id = generateId();

        store.dispatch({
            type: ActionTypes.RECEIVED_PLUGIN_POST_COMPONENT,
            data: {
                id,
                pluginId: this.id,
                type,
                component,
            },
        });

        return id;
    }

    // Unregister a component that provided a custom body for posts with a specific type.
    // Accepts a string id.
    // Returns undefined in all cases.
    unregisterPostTypeComponent(componentId) {
        store.dispatch({
            type: ActionTypes.REMOVED_PLUGIN_POST_COMPONENT,
            id: componentId,
        });
    }
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import store from '@store/store';
import PluginRegistry from '@plugins/registry';
import SampleMobilePlugin from '@plugins/builtin/sample';

// plugins records all active web app plugins by id.
const plugins = {
    'sample-mobile-plugin': SampleMobilePlugin,
};

export function initializePlugins() {
    Object.keys(plugins).forEach((id) => {
        initializePlugin(id);
    });
}

// initializePlugin creates a registry specific to the plugin and invokes any initialize function
// on the registered plugin class.
export function initializePlugin(id) {
    // Initialize the plugin
    const plugin = plugins[id];
    const registry = new PluginRegistry(id);
    if (plugin && plugin.initialize) {
        plugin.initialize(registry, store);
    }
}

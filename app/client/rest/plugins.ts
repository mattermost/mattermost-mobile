// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ClientBase from './base';

export interface ClientPluginsMix {
    getPluginsManifests: () => Promise<ClientPluginManifest[]>;
}

const ClientPlugins = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    getPluginsManifests = async () => {
        return this.doFetch(
            `${this.getPluginsRoute()}/webapp`,
            {method: 'get'},
        );
    };
};

export default ClientPlugins;

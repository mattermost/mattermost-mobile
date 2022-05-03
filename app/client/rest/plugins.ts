// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ClientPluginManifest} from '@mm-redux/types/plugins';

export interface ClientPluginsMix {
    getPluginsManifests: () => Promise<ClientPluginManifest[]>;
}

const ClientPlugins = (superclass: any) => class extends superclass {
    getPluginsManifests = async () => {
        return this.doFetch(
            `${this.getPluginsRoute()}/webapp`,
            {method: 'get'},
        );
    };
};

export default ClientPlugins;

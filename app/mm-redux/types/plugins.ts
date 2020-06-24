// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type ClientPluginManifest = {
    id: string;
    min_server_version?: string;
    version: string;
    webapp: {
        bundle_path: string;
    };
}

export type MarketplacePlugin = {
    homepage_url: string;
    download_url: string;
    manifest: {
        id: string;
        name: string;
        description: string;
        version: string;
        minServerVersion: string;
    };
    installed_version: string;
}

export type PluginTrigger = {
    id: string;
    location: string;
    trigger: string;
    extra: any;
}

export type PluginsState = {
    mobilePlugins: PluginTrigger[];
}
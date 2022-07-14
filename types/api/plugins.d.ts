// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type ClientPluginManifest = {
    id: string;
    min_server_version?: string;
    version: string;
    webapp: {
        bundle_path: string;
    };
}

type MarketplacePlugin = {
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

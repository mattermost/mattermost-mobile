// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {PersistenceFlag} from '@typings/database/models/app/servers';

export type CachedActiveServer = {
    url: string;
    displayName: string;
    persistenceFlag: PersistenceFlag;
};

let cachedActiveServer: CachedActiveServer | undefined;

export function setCachedActiveServer(server: CachedActiveServer | undefined) {
    cachedActiveServer = server;
}

export function getCachedActiveServer() {
    return cachedActiveServer;
}

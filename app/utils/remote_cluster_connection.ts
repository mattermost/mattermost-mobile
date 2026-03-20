// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {toMilliseconds} from '@utils/datetime';

const SITE_URL_PENDING_PREFIX = 'pending_';
const CONNECTED_PING_THRESHOLD_MS = toMilliseconds({minutes: 5});

export type RemoteConnectionInfo = {
    site_url?: string;
    last_ping_at: number;
};

export function isRemoteClusterConfirmed(rc: RemoteConnectionInfo): boolean {
    return Boolean(rc.site_url && !rc.site_url.startsWith(SITE_URL_PENDING_PREFIX));
}

export function isRemoteClusterConnected(rc: RemoteConnectionInfo): boolean {
    if (!rc.last_ping_at) {
        return false;
    }
    return (Date.now() - rc.last_ping_at) <= CONNECTED_PING_THRESHOLD_MS;
}

export type RemoteConnectionStatus = 'connection_pending' | 'connected' | 'offline';

export function getRemoteClusterConnectionStatus(rc: RemoteConnectionInfo): RemoteConnectionStatus {
    if (!isRemoteClusterConfirmed(rc)) {
        return 'connection_pending';
    }
    return isRemoteClusterConnected(rc) ? 'connected' : 'offline';
}

export type ConnectionStatus = 'pending_save' | 'connection_pending' | 'connected' | 'offline';

export type WorkspaceWithStatus = RemoteConnectionInfo & {
    pendingSave?: boolean;
};

export function getConnectionStatus(w: WorkspaceWithStatus): ConnectionStatus {
    if (w.pendingSave) {
        return 'pending_save';
    }
    return getRemoteClusterConnectionStatus(w);
}

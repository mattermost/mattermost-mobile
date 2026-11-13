// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect} from 'react';
import {combineLatest} from 'rxjs';

import {fetchRenderPermissions} from '@actions/remote/render_permissions';
import {useServerUrl} from '@context/server';
import DatabaseManager from '@database/manager';
import WebsocketManager from '@managers/websocket_manager';
import {observeShouldFetchRenderPermissions} from '@queries/servers/render_permissions';

/**
 * Keeps the render-time ABAC decisions for a channel current while the calling component is mounted:
 * fetched on mount, and again after any ABAC invalidation, expiry or network change, waiting for the
 * server to be reachable. Mount it once per surface that offers the gated actions (a composer), so the
 * trigger follows the channel actually on screen whichever way it was reached.
 */
export const useFetchRenderPermissions = (channelId?: string) => {
    const serverUrl = useServerUrl();

    useEffect(() => {
        const database = DatabaseManager.serverDatabases[serverUrl]?.database;
        if (!channelId || !database) {
            return undefined;
        }

        const subscription = combineLatest([
            observeShouldFetchRenderPermissions(database, serverUrl, channelId),
            WebsocketManager.observeWebsocketState(serverUrl),
        ]).subscribe(([shouldFetch, websocketState]) => {
            if (shouldFetch && websocketState === 'connected') {
                fetchRenderPermissions(serverUrl, channelId);
            }
        });

        return () => subscription.unsubscribe();
    }, [serverUrl, channelId]);
};

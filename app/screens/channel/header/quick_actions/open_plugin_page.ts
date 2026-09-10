// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {openBrowserAsync} from 'expo-web-browser';

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

type SessionResponse = {
    token?: string;
};

/**
 * Opens a plugin-served page in the system browser.
 *
 * The browser carries no Mattermost session, so the app -- which is authenticated --
 * first asks the plugin for a short-lived token and passes it in the URL. The plugin
 * redeems the token itself, which keeps the user's session token out of the page and
 * limits what the page can reach to the plugin that issued it.
 */
export const openPluginPage = async (
    serverUrl: string,
    pluginId: string,
    route: string,
    channelId: string,
    theme: Theme,
) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const session = await client.doFetch(
            `/plugins/${pluginId}/mobile/session`,
            {method: 'post'},
        ) as SessionResponse;

        if (!session?.token) {
            logError('openPluginPage: plugin did not return a session token');
            return;
        }

        // A binding's route may already carry its own query string, so pick the
        // right separator rather than always appending '?'.
        const params = new URLSearchParams({t: session.token, channel_id: channelId});
        const separator = route.includes('?') ? '&' : '?';
        const url = `${serverUrl}/plugins/${pluginId}${route}${separator}${params.toString()}`;

        await openBrowserAsync(url, {
            toolbarColor: theme.sidebarBg,
            controlsColor: theme.sidebarHeaderTextColor,
            secondaryToolbarColor: theme.centerChannelBg,
        });
    } catch (error) {
        logError('openPluginPage failed', getFullErrorMessage(error));
    }
};

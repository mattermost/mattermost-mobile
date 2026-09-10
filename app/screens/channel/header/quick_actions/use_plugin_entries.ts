// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

// POC: hardcoded to the demo plugin. A real implementation would iterate the
// installed plugins from GET /plugins/webapp and query each one that declares a
// mobile bindings endpoint in its manifest.
const POC_PLUGIN_ID = 'com.mattermost.demo-plugin';

export type PluginMobileEntry = {
    label: string;
    icon: string;
    url: string;
};

type BindingsResponse = {
    entries?: PluginMobileEntry[];
};

/**
 * Fetches the mobile entry points a plugin advertises, so the quick actions
 * sheet can render one button per entry rather than hardcoding them.
 */
export const usePluginEntries = (serverUrl: string) => {
    const [entries, setEntries] = useState<PluginMobileEntry[]>([]);

    useEffect(() => {
        let cancelled = false;

        const fetchEntries = async () => {
            try {
                const client = NetworkManager.getClient(serverUrl);
                const response = await client.doFetch(
                    `/plugins/${POC_PLUGIN_ID}/mobile/bindings`,
                    {method: 'get'},
                ) as BindingsResponse;

                logDebug('usePluginEntries: got', response?.entries?.length ?? 0, 'entries from', serverUrl);
                if (!cancelled) {
                    setEntries(response?.entries ?? []);
                }
            } catch (error) {
                // Plugin not installed or has no mobile bindings; render nothing.
                logDebug('usePluginEntries: bindings unavailable from', serverUrl, getFullErrorMessage(error));
                if (!cancelled) {
                    setEntries([]);
                }
            }
        };

        fetchEntries();

        return () => {
            cancelled = true;
        };
    }, [serverUrl]);

    return {entries, pluginId: POC_PLUGIN_ID};
};

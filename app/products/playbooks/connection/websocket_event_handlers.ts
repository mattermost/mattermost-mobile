// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {WebSocketMessage} from '@types/api/websocket';
import {getPlaybooksConfigIfEnabled} from '@queries/playbooks/servers';
import {queryClient} from '@queries/servers';

export const handlePlaybookRunUpdated = async (serverUrl: string, msg: WebSocketMessage) => {
    if (!msg.data) {
        return;
    }

    const config = await getPlaybooksConfigIfEnabled(serverUrl);
    if (!config?.pluginEnabled) {
        return;
    }

    // Invalidate playbook run cache to trigger refetch
    queryClient.invalidateQueries({
        queryKey: ['playbook_runs', serverUrl],
    });
};

export const handlePlaybookRunCreated = async (serverUrl: string, msg: WebSocketMessage) => {
    if (!msg.data) {
        return;
    }

    const config = await getPlaybooksConfigIfEnabled(serverUrl);
    if (!config?.pluginEnabled) {
        return;
    }

    // Invalidate playbook runs list cache
    queryClient.invalidateQueries({
        queryKey: ['playbook_runs', serverUrl],
    });
};

export const handlePlaybookCreated = async (serverUrl: string, msg: WebSocketMessage) => {
    if (!msg.data) {
        return;
    }

    const config = await getPlaybooksConfigIfEnabled(serverUrl);
    if (!config?.pluginEnabled) {
        return;
    }

    // Invalidate playbooks list cache
    queryClient.invalidateQueries({
        queryKey: ['playbooks', serverUrl],
    });
};

export const handlePlaybookArchived = async (serverUrl: string, msg: WebSocketMessage) => {
    if (!msg.data) {
        return;
    }

    const config = await getPlaybooksConfigIfEnabled(serverUrl);
    if (!config?.pluginEnabled) {
        return;
    }

    // Invalidate playbooks list cache
    queryClient.invalidateQueries({
        queryKey: ['playbooks', serverUrl],
    });
};

export const handlePlaybookRestored = async (serverUrl: string, msg: WebSocketMessage) => {
    if (!msg.data) {
        return;
    }

    const config = await getPlaybooksConfigIfEnabled(serverUrl);
    if (!config?.pluginEnabled) {
        return;
    }

    // Invalidate playbooks list cache
    queryClient.invalidateQueries({
        queryKey: ['playbooks', serverUrl],
    });
};

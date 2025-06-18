// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {handlePlaybookRuns} from '@playbooks/actions/local/run';
import EphemeralStore from '@store/ephemeral_store';
import {safeParseJSON} from '@utils/helpers';

export const handlePlaybookRunCreated = async (serverUrl: string, msg: WebSocketMessage) => {
    if (msg.data.payload) {
        return;
    }
    const data = safeParseJSON(msg.data.payload);
    if (!data) {
        return;
    }

    const playbookRun = data as PlaybookRun;

    const isSynced = EphemeralStore.getChannelPlaybooksSynced(serverUrl, playbookRun.channel_id);
    if (!isSynced) {
        // We don't update the run because any information we currently have may be outdated
        return;
    }

    await handlePlaybookRuns(serverUrl, [playbookRun], false, true);
};

export const handlePlaybookRunUpdated = async (serverUrl: string, msg: WebSocketMessage) => {
    if (!msg.data.payload) {
        return;
    }
    const data = safeParseJSON(msg.data.payload);
    if (!data) {
        return;
    }

    const playbookRun = data as PlaybookRun;

    const isSynced = EphemeralStore.getChannelPlaybooksSynced(serverUrl, playbookRun.channel_id);
    if (!isSynced) {
        // We don't update the run because any information we currently have may be outdated
        return;
    }

    await handlePlaybookRuns(serverUrl, [playbookRun], false, true);
};

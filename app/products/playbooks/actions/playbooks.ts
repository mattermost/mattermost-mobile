// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import Playbooks from '@constants/playbooks';
import NetworkManager from '@managers/network_manager';
import {PlaybookRunStatus} from '@playbooks/client/rest';
import {getPlaybooksConfig, setPlaybookRunsForTeam} from '@playbooks/state';
import {setPluginEnabled} from '@playbooks/state/actions';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

export const checkIsPlaybooksPluginEnabled = async (serverUrl: string) => {
    let data: ClientPluginManifest[] = [];
    try {
        const client = NetworkManager.getClient(serverUrl);
        data = await client.getPluginsManifests();
    } catch (error) {
        logDebug('error on checkIsPlaybooksPluginEnabled', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }

    const enabled = data.findIndex((m) => m.id === Playbooks.PluginId) !== -1;
    const curEnabled = getPlaybooksConfig(serverUrl).pluginEnabled;
    if (enabled !== curEnabled) {
        setPluginEnabled(serverUrl, enabled);
    }

    return {data: enabled};
};

export const loadPlaybookRunsForTeamAndUser = async (serverUrl: string, teamId: string, userId: string) => {
    // let resp: CallChannelState[] = [];
    try {
        const client = NetworkManager.getClient(serverUrl);

        const resp = await client.getPlaybookRuns(teamId, {participant_id: userId, statuses: [PlaybookRunStatus.InProgress]});
        setPlaybookRunsForTeam(serverUrl, teamId, resp.items);
    } catch (error) {
        logDebug('error on loadPlaybooksRunsForUser', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }

    // const playbooksResults: Dictionary<Call> = {};
    // const enabledChannels: Dictionary<boolean> = {};
    // const ids = new Set<string>();
    //
    // for (const channel of resp) {
    //     if (channel.call) {
    //         playbooksResults[channel.channel_id] = createCallAndAddToIds(channel.channel_id, convertOldCallToNew(channel.call), ids);
    //     }
    //
    //     if (typeof channel.enabled !== 'undefined') {
    //         enabledChannels[channel.channel_id] = channel.enabled;
    //     }
    // }
    //
    // // Batch load user models async because we'll need them later
    // if (ids.size > 0) {
    //     fetchUsersByIds(serverUrl, Array.from(ids));
    // }
    //
    // setPlaybooks(serverUrl, userId, playbooksResults, enabledChannels);

    return {data: {}};
};

export const loadPlaybooks = async (serverUrl: string, teamId: string, userId: string) => {
    const res = await checkIsPlaybooksPluginEnabled(serverUrl);
    if (res.data) {
        loadPlaybookRunsForTeamAndUser(serverUrl, teamId, userId);
    }
};

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import DatabaseManager from '@database/manager';
import IntegrationsMananger from '@managers/integrations_manager';
import NetworkManager from '@managers/network_manager';
import {getCurrentChannelId, getCurrentTeamId} from '@queries/servers/system';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import {forceLogoutIfNecessary} from './session';

export const submitInteractiveDialog = async (serverUrl: string, submission: DialogSubmission) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        submission.channel_id = await getCurrentChannelId(database);
        submission.team_id = await getCurrentTeamId(database);
        const data = await client.submitInteractiveDialog(submission);
        return {data};
    } catch (error) {
        logDebug('error on submitInteractiveDialog', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const postActionWithCookie = async (serverUrl: string, postId: string, actionId: string, actionCookie: string, selectedOption = '') => {
    try {
        const client = NetworkManager.getClient(serverUrl);

        const data = await client.doPostActionWithCookie(postId, actionId, actionCookie, selectedOption);
        if (data?.trigger_id) {
            IntegrationsMananger.getManager(serverUrl)?.setTriggerId(data.trigger_id);
        }

        return {data};
    } catch (error) {
        logDebug('error on postActionWithCookie', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const selectAttachmentMenuAction = (serverUrl: string, postId: string, actionId: string, selectedOption: string) => {
    return postActionWithCookie(serverUrl, postId, actionId, '', selectedOption);
};

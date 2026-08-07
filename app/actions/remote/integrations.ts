// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import DatabaseManager from '@database/manager';
import IntegrationsMananger from '@managers/integrations_manager';
import NetworkManager from '@managers/network_manager';
import {getBlockActionsEnabled} from '@queries/servers/features';
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

export const lookupInteractiveDialog = async (serverUrl: string, submission: DialogSubmission) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        submission.channel_id = await getCurrentChannelId(database);
        submission.team_id = await getCurrentTeamId(database);

        const data = await client.lookupInteractiveDialog(submission);
        return {data};
    } catch (error) {
        logDebug('error on lookupInteractiveDialog', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const executeDialogAction = async (serverUrl: string, url: string, context?: Record<string, string>) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const channelId = await getCurrentChannelId(database);
        const teamId = await getCurrentTeamId(database);
        const data = await client.executeDialogAction(url, context, channelId, teamId);
        if (data?.trigger_id) {
            IntegrationsMananger.getManager(serverUrl)?.setTriggerId(data.trigger_id);
        }

        return {data};
    } catch (error) {
        logDebug('error on executeDialogAction', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const postActionWithCookie = async (
    serverUrl: string,
    postId: string,
    actionId: string,
    actionCookie: string,
    selectedOption = '',
    query?: Record<string, string>,
    integrationFormat: PostActionIntegrationFormat = 'attachment',
) => {
    try {
        const client = NetworkManager.getClient(serverUrl);

        const data = await client.doPostActionWithCookie(
            postId,
            actionId,
            actionCookie,
            selectedOption,
            query,
            integrationFormat,
        );
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

export const doBlockAction = async (serverUrl: string, request: DoBlockActionRequest) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        // doBlockAction (POST /actions/blocks/do) requires BLOCK_ACTIONS_VERSION+ and MmBlocks enabled.
        // Older / flag-off servers keep using the post-actions endpoint for post execute (form_values ignored).
        if (!(await getBlockActionsEnabled(database))) {
            if (request.context === 'post' && request.subtype !== 'lookup' && request.post_id) {
                return postActionWithCookie(
                    serverUrl,
                    request.post_id,
                    request.action_id,
                    request.cookie ?? '',
                    request.selected_option ?? '',
                    request.query,
                    request.integration_format ?? 'mm_block',
                );
            }

            logDebug('doBlockAction unavailable: block actions not enabled for this server');
            return {error: new Error('Block actions are not available on this server')};
        }

        const client = NetworkManager.getClient(serverUrl);

        const payload = {...request};
        if (payload.context === 'dialog' && !payload.channel_id) {
            // Match legacy dialog submit: current channel for ephemeral delivery only.
            payload.channel_id = await getCurrentChannelId(database);
        }

        const data = await client.doBlockAction(payload);
        if (data?.trigger_id) {
            IntegrationsMananger.getManager(serverUrl)?.setTriggerId(data.trigger_id);
        }

        return {data};
    } catch (error) {
        logDebug('error on doBlockAction', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const selectAttachmentMenuAction = (serverUrl: string, postId: string, actionId: string, selectedOption: string) => {
    return postActionWithCookie(serverUrl, postId, actionId, '', selectedOption);
};

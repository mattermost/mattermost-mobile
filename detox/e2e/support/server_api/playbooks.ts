// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import client from './client';
import {getResponseFromError} from './common';
import PlaybooksHelpers from './playbooks_helpers';

const playbookRunsEndpoint = '/plugins/playbooks/api/v0/runs';
const playbooksEndpoint = '/plugins/playbooks/api/v0/playbooks';
const configEndpoint = '/api/v4/config';
const pluginsEndpoint = '/api/v4/plugins';
const StatusOK = 200;

interface PlaybookRun {
    id?: string;
    name: string;
    owner_user_id: string;
    team_id: string;
    playbook_id: string;
    channel_id: string;
    description?: string;
    end_at?: number;
}

interface Checklist {
    title: string;
    items: ChecklistItem[];
}

interface ChecklistItem {
    title: string;
    description?: string;
    command?: string;
    state?: string;
    assignee_id?: string;
}

interface PlaybookMember {
    user_id: string;
    roles: string[];
}

interface Metric {
    id?: string;
    title: string;
    description?: string;
    type: string;
    target?: number;
}

interface Playbook {
    id?: string;
    title: string;
    description?: string;
    team_id: string;
    create_public_playbook_run?: boolean;
    create_channel_member_on_new_participant?: boolean;
    checklists: Checklist[];
    members?: PlaybookMember[];
    public?: boolean;
    broadcast_enabled?: boolean;
    broadcast_channel_ids?: string[];
    reminder_message_template?: string;
    reminder_timer_default_seconds?: number;
    status_update_enabled?: boolean;
    retrospective_reminder_interval_seconds?: number;
    retrospective_template?: string;
    retrospective_enabled?: boolean;
    invited_user_ids?: string[];
    invite_users_enabled?: boolean;
    default_owner_id?: string;
    default_owner_enabled?: boolean;
    announcement_channel_id?: string;
    announcement_channel_enabled?: boolean;
    webhook_on_creation_urls?: string[];
    webhook_on_creation_enabled?: boolean;
    webhook_on_status_update_urls?: string[];
    webhook_on_status_update_enabled?: boolean;
    message_on_join?: string;
    message_on_join_enabled?: boolean;
    signal_any_keywords?: string[];
    signal_any_keywords_enabled?: boolean;
    channel_name_template?: string;
    run_summary_template?: string;
    run_summary_template_enabled?: boolean;
    channel_mode?: string;
    channel_id?: string;
    metrics?: Metric[];
}

/**
 * Get the server configuration
 * @param {string} baseUrl - the base server URL
 * @param {boolean} old - whether to use the old config format
 * @return {Object} returns { config: Object } on success or { error, status } on error
 */
export const apiGetConfig = async (baseUrl: string, old: boolean = false): Promise<any> => {
    try {
        const response = await client.get(
            `${baseUrl}${configEndpoint}${old ? '/client?format=old' : ''}`,
        );

        if (response.status === StatusOK) {
            return {config: response.data};
        }
        throw new Error(`Unexpected status code: ${response.status}`);
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Update the server configuration
 * @param {string} baseUrl - the base server URL
 * @param {Object} newConfig - the configuration updates to apply
 * @return {Object} returns { config: Object } on success or { error, status } on error
 */
export const apiUpdateConfig = async (baseUrl: string, newConfig: any = {}): Promise<any> => {
    try {
        // Get current config
        const currentConfigResponse = await apiGetConfig(baseUrl);

        if ('error' in currentConfigResponse) {
            throw new Error(`Failed to get current config: ${currentConfigResponse.error}`);
        }
        const currentConfig = currentConfigResponse.config;

        // Merge configurations (basic merge; replace with your merge utility if available)
        const config = {...currentConfig, ...newConfig};

        // Update the config
        const response = await client.put(
            `${baseUrl}${configEndpoint}/patch`,
            config,
            {
                headers: {'X-Requested-With': 'XMLHttpRequest'},
            },
        );

        if (response.status === StatusOK) {
            // Fetch the updated config
            return await apiGetConfig(baseUrl);
        }
        throw new Error(`Unexpected status code: ${response.status}`);
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Enable the Playbooks plugin
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns { config: Object } on success or { error, status } on error
 */
export const apiEnablePlaybooksPlugin = async (baseUrl: string): Promise<any> => {
    try {
        // Get current config
        const currentConfigResponse = await apiGetConfig(baseUrl);

        if ('error' in currentConfigResponse) {
            throw new Error(`Failed to get current config: ${currentConfigResponse.error}`);
        }

        // Update the Playbooks plugin state to enabled
        const updatedConfig = {
            PluginSettings: {
                ...currentConfigResponse.config.PluginSettings,
                PluginStates: {
                    ...currentConfigResponse.config.PluginSettings.PluginStates,
                    playbooks: {
                        ...currentConfigResponse.config.PluginSettings.PluginStates.playbooks,
                        Enabled: true,
                    },
                },
            },
        };

        // Update the configuration
        const update = await apiUpdateConfig(baseUrl, updatedConfig);

        return update;
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Enable a plugin by ID
 * @param {string} baseUrl - the base server URL
 * @param {string} pluginId - the ID of the plugin to enable (e.g., 'playbooks')
 * @return {Object} returns { status: string } on success or { error, status } on error
 */
export const apiEnablePlugin = async (baseUrl: string, pluginId: string): Promise<any> => {
    try {
        const response = await client.post(
            `${baseUrl}${pluginsEndpoint}/${pluginId}/enable`,
        );

        if (response.status === StatusOK) {
            return {status: response.data.status};
        }
        throw new Error(`Unexpected status code: ${response.status}`);
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get all playbook runs
 * @param {string} baseUrl - the base server URL
 * @param {string} teamId - the team ID
 * @param {Object} options - additional options like per_page
 * @return {Object} returns {items: PlaybookRun[]} on success or {error, status} on error
 */
export const apiGetAllPlaybookRuns = async (baseUrl: string, teamId: string, options: {per_page?: number} = {}): Promise<any> => {
    try {
        const response = await client.get(
            `${baseUrl}${playbookRunsEndpoint}`,
            {
                params: {
                    team_id: teamId,
                    per_page: options.per_page || 10000,
                },
            },
        );

        return response.data;
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get all InProgress playbook runs
 * @param {string} baseUrl - the base server URL
 * @param {string} teamId - the team ID
 * @param {string} userId - optional user ID to filter by participant
 * @return {Object} returns {items: PlaybookRun[]} on success or {error, status} on error
 */
export const apiGetAllInProgressPlaybookRuns = async (baseUrl: string, teamId: string, userId: string = ''): Promise<any> => {
    try {
        const response = await client.get(
            `${baseUrl}${playbookRunsEndpoint}`,
            {
                params: {
                    team_id: teamId,
                    status: 'InProgress',
                    participant_id: userId,
                },
            },
        );

        return response.data;
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get playbook run by name
 * @param {string} baseUrl - the base server URL
 * @param {string} teamId - the team ID
 * @param {string} name - the playbook run name to search for
 * @return {Object} returns {items: PlaybookRun[]} on success or {error, status} on error
 */
export const apiGetPlaybookRunByName = async (baseUrl: string, teamId: string, name: string): Promise<any> => {
    try {
        const response = await client.get(
            `${baseUrl}${playbookRunsEndpoint}`,
            {
                params: {
                    team_id: teamId,
                    search_term: name,
                },
            },
        );

        return response.data;
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get a playbook run by ID
 * @param {string} baseUrl - the base server URL
 * @param {string} playbookRunId - the playbook run ID
 * @return {Object} returns {PlaybookRun} on success or {error, status} on error
 */
export const apiGetPlaybookRun = async (baseUrl: string, playbookRunId: string): Promise<any> => {
    try {
        const response = await client.get(
            `${baseUrl}${playbookRunsEndpoint}/${playbookRunId}`,
        );

        return response.data;
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Start a playbook run
 * @param {string} baseUrl - the base server URL
 * @param {Object} playbookRun - the playbook run to create
 * @param {Object} options - additional options
 * @return {Object} returns the created playbook run on success or {error, status} on error
 */
export const apiRunPlaybook = async (
    baseUrl: string,
    playbookRun: PlaybookRun,
    options: {expectedStatusCode?: number} = {},
): Promise<any> => {
    try {
        const response = await client.post(
            `${baseUrl}${playbookRunsEndpoint}`,
            playbookRun,
        );

        return response.data;
    } catch (err) {
        if (options.expectedStatusCode && (err as any).response && (err as any).response.status === options.expectedStatusCode) {
            return (err as any).response.data;
        }
        return getResponseFromError(err);
    }
};

/**
 * Finish a playbook run
 * @param {string} baseUrl - the base server URL
 * @param {string} playbookRunId - the playbook run ID to finish
 * @return {Object} returns the updated playbook run on success or {error, status} on error
 */
export const apiFinishRun = async (baseUrl: string, playbookRunId: string): Promise<any> => {
    try {
        const response = await client.put(
            `${baseUrl}${playbookRunsEndpoint}/${playbookRunId}/finish`,
        );

        return response.data;
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Update a playbook run's status
 * @param {string} baseUrl - the base server URL
 * @param {string} playbookRunId - the playbook run ID
 * @param {string} message - the status message
 * @param {number} reminder - reminder in seconds
 * @return {Object} returns the updated status on success or {error, status} on error
 */
export const apiUpdateStatus = async (
    baseUrl: string,
    playbookRunId: string,
    message: string,
    reminder: number = 300,
): Promise<any> => {
    try {
        const response = await client.post(
            `${baseUrl}${playbookRunsEndpoint}/${playbookRunId}/status`,
            {
                message,
                reminder,
            },
        );

        return response.data;
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Change the owner of a playbook run
 * @param {string} baseUrl - the base server URL
 * @param {string} playbookRunId - the playbook run ID
 * @param {string} userId - the new owner user ID
 * @return {Object} returns the updated playbook run on success or {error, status} on error
 */
export const apiChangePlaybookRunOwner = async (baseUrl: string, playbookRunId: string, userId: string): Promise<any> => {
    try {
        const response = await client.post(
            `${baseUrl}${playbookRunsEndpoint}/${playbookRunId}/owner`,
            {
                owner_id: userId,
            },
        );

        return response.data;
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Change the assignee of a checklist item
 * @param {string} baseUrl - the base server URL
 * @param {string} playbookRunId - the playbook run ID
 * @param {string} checklistId - the checklist ID
 * @param {string} itemId - the checklist item ID
 * @param {string} userId - the new assignee user ID
 * @return {Object} returns the updated checklist item on success or {error, status} on error
 */
export const apiChangeChecklistItemAssignee = async (
    baseUrl: string,
    playbookRunId: string,
    checklistId: string,
    itemId: string,
    userId: string,
): Promise<any> => {
    try {
        const response = await client.put(
            `${baseUrl}${playbookRunsEndpoint}/${playbookRunId}/checklists/${checklistId}/item/${itemId}/assignee`,
            {
                assignee_id: userId,
            },
        );

        return response.data;
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Set a checklist item state
 * @param {string} baseUrl - the base server URL
 * @param {string} playbookRunId - the playbook run ID
 * @param {string} checklistId - the checklist ID
 * @param {string} itemId - the checklist item ID
 * @param {string} state - the new state ('' or 'closed')
 * @return {Object} returns the updated checklist item on success or {error, status} on error
 */
export const apiSetChecklistItemState = async (
    baseUrl: string,
    playbookRunId: string,
    checklistId: string,
    itemId: string,
    state: string,
): Promise<any> => {
    try {
        const response = await client.put(
            `${baseUrl}${playbookRunsEndpoint}/${playbookRunId}/checklists/${checklistId}/item/${itemId}/state`,
            {
                new_state: state,
            },
        );

        return response.data;
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Create a playbook
 * @param {string} baseUrl - the base server URL
 * @param {Object} playbook - the playbook to create
 * @return {Object} returns the created playbook on success or {error, status} on error
 */
export const apiCreatePlaybook = async (baseUrl: String, playbook: Playbook): Promise<any> => {
    try {
        const response = await client.post(`${baseUrl}${playbooksEndpoint}`, playbook);
        return response.data;
    } catch (err) {
        throw new Error(`Failed to create playbook: ${err}`);
    }
};

/**
 * Create a test playbook with basic settings
 * @param {string} baseUrl - the base server URL
 * @param {Object} options - playbook options
 * @return {Object} returns the created playbook on success or {error, status} on error
 */
export const apiCreateTestPlaybook = async (
    {
        baseUrl,
        teamId,
        title,
        userId,
        broadcastEnabled,
        broadcastChannelIds,
        reminderMessageTemplate,
        checklists,
        inviteUsersEnabled,
        reminderTimerDefaultSeconds = 24 * 60 * 60, // 24 hours
        otherMembers = [],
        invitedUserIds = [],
        channelNameTemplate = '',
    }: {
        baseUrl: string;
        teamId: string;
        title: string;
        userId: string;
        broadcastEnabled?: boolean;
        broadcastChannelIds?: string[];
        reminderMessageTemplate?: string;
        checklists?: Checklist[];
        inviteUsersEnabled?: boolean;
        reminderTimerDefaultSeconds?: number;
        otherMembers?: string[];
        invitedUserIds?: string[];
        channelNameTemplate?: string;
    },
): Promise<any> => {
    const defaultChecklists: Checklist[] = [{
        title: 'Stage 1',
        items: [
            {title: 'Step 1'},
            {title: 'Step 2'},
        ],
    }];

    return apiCreatePlaybook(
        baseUrl,
        {
            team_id: teamId,
            title,
            checklists: checklists || defaultChecklists,
            members: [
                {user_id: userId, roles: ['playbook_member', 'playbook_admin']},
                ...otherMembers.map((id) => ({user_id: id, roles: ['playbook_member', 'playbook_admin']})),
            ],
            broadcast_enabled: broadcastEnabled,
            broadcast_channel_ids: broadcastChannelIds,
            reminder_message_template: reminderMessageTemplate,
            reminder_timer_default_seconds: reminderTimerDefaultSeconds,
            invited_user_ids: invitedUserIds,
            invite_users_enabled: inviteUsersEnabled,
            channel_name_template: channelNameTemplate,
            create_channel_member_on_new_participant: true,
        },
    );
};

/**
 * Get a playbook by ID
 * @param {string} baseUrl - the base server URL
 * @param {string} playbookId - the playbook ID
 * @return {Object} returns the playbook on success or {error, status} on error
 */
export const apiGetPlaybook = async (baseUrl: string, playbookId: string): Promise<any> => {
    try {
        const response = await client.get(
            `${baseUrl}${playbooksEndpoint}/${playbookId}`,
        );

        return response.data;
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Update a playbook
 * @param {string} baseUrl - the base server URL
 * @param {Object} playbook - the playbook to update
 * @param {number} expectedHttpCode - expected HTTP status code
 * @return {Object} returns the updated playbook on success or {error, status} on error
 */
export const apiUpdatePlaybook = async (
    baseUrl: string,
    playbook: Playbook,
    expectedHttpCode: number = StatusOK,
): Promise<any> => {
    try {
        const response = await client.put(
            `${baseUrl}${playbooksEndpoint}/${playbook.id}`,
            playbook,
        );

        return response.data;
    } catch (err) {
        if ((err as any).response && (err as any).response.status === expectedHttpCode) {
            return (err as any).response.data;
        }
        return getResponseFromError(err);
    }
};

/**
 * Archive a playbook
 * @param {string} baseUrl - the base server URL
 * @param {string} playbookId - the playbook ID to archive
 * @return {Object} returns {status} on success or {error, status} on error
 */
export const apiArchivePlaybook = async (baseUrl: string, playbookId: string): Promise<any> => {
    try {
        const response = await client.delete(
            `${baseUrl}${playbooksEndpoint}/${playbookId}`,
        );

        return {status: response.status};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Follow a playbook run
 * @param {string} baseUrl - the base server URL
 * @param {string} playbookRunId - the playbook run ID to follow
 * @return {Object} returns the response on success or {error, status} on error
 */
export const apiFollowPlaybookRun = async (baseUrl: string, playbookRunId: string): Promise<any> => {
    try {
        const response = await client.put(
            `${baseUrl}${playbookRunsEndpoint}/${playbookRunId}/followers`,
        );

        return response.data;
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Unfollow a playbook run
 * @param {string} baseUrl - the base server URL
 * @param {string} playbookRunId - the playbook run ID to unfollow
 * @return {Object} returns the response on success or {error, status} on error
 */
export const apiUnfollowPlaybookRun = async (baseUrl: string, playbookRunId: string): Promise<any> => {
    try {
        const response = await client.delete(
            `${baseUrl}${playbookRunsEndpoint}/${playbookRunId}/followers`,
        );

        return response.data;
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Add users to a playbook run
 * @param {string} baseUrl - the base server URL
 * @param {string} playbookRunId - the playbook run ID
 * @param {string[]} userIds - array of user IDs to add
 * @return {Object} returns the response on success or {error, status} on error
 */
export const apiAddUsersToRun = async (baseUrl: string, playbookRunId: string, userIds: string[]): Promise<any> => {
    try {
        const query = `
            mutation AddRunParticipants($runID: String!, $userIDs: [String!]!) {
                addRunParticipants(runID: $runID, userIDs: $userIDs)
            }
        `;
        const variables = {
            runID: playbookRunId,
            userIDs: userIds,
        };

        const response = await client.post(
            `${baseUrl}/plugins/playbooks/api/v0/query`,
            {
                query,
                operationName: 'AddRunParticipants',
                variables,
            },
        );

        return response.data;
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Update a playbook run
 * @param {string} baseUrl - the base server URL
 * @param {string} playbookRunId - the playbook run ID
 * @param {Object} updates - the updates to apply
 * @return {Object} returns the response on success or {error, status} on error
 */
export const apiUpdateRun = async (baseUrl: string, playbookRunId: string, updates: any): Promise<any> => {
    try {
        const query = `
            mutation UpdateRun($id: String!, $updates: RunUpdates!) {
                updateRun(id: $id, updates: $updates)
            }
        `;
        const variables = {
            id: playbookRunId,
            updates,
        };

        const response = await client.post(
            `${baseUrl}/plugins/playbooks/api/v0/query`,
            {
                query,
                operationName: 'UpdateRun',
                variables,
            },
        );

        return response.data;
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Delete a playbook
 * @param {string} baseUrl - the base server URL
 * @param {string} playbookId - the playbook ID to delete
 * @return {Object} returns {status} on success or {error, status} on error
 */
export const apiDeletePlaybook = async (baseUrl: string, playbookId: string): Promise<any> => {
    try {
        const response = await client.delete(
            `${baseUrl}${playbooksEndpoint}/${playbookId}`,
        );
        return {status: response.status};
    } catch (err) {
        return getResponseFromError(err);
    }
};

export const Playbooks = {
    apiEnablePlaybooksPlugin,
    apiGetConfig,
    apiGetAllPlaybookRuns,
    apiGetAllInProgressPlaybookRuns,
    apiGetPlaybookRunByName,
    apiGetPlaybookRun,
    apiRunPlaybook,
    apiFinishRun,
    apiUpdateStatus,
    apiChangePlaybookRunOwner,
    apiChangeChecklistItemAssignee,
    apiSetChecklistItemState,
    apiCreatePlaybook,
    apiCreateTestPlaybook,
    apiGetPlaybook,
    apiUpdatePlaybook,
    apiArchivePlaybook,
    apiFollowPlaybookRun,
    apiUnfollowPlaybookRun,
    apiAddUsersToRun,
    apiUpdateRun,
    apiUpdateConfig,
    apiDeletePlaybook,
    apiEnablePlugin,
    ...PlaybooksHelpers,
};

export default Playbooks;

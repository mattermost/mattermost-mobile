// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import client from './client';
import {getResponseFromError} from './common';

type SlashCommand = {
    trigger: string;
};

type WaitForSlashCommandOptions = {
    timeoutMs?: number;
    intervalMs?: number;
};

type TeamCommandsResult = {
    commands?: SlashCommand[];
    error?: {message?: string};
    status?: number;
};

export const apiCreateCommand = async (baseUrl: string, command: Record<string, any>): Promise<any> => {
    try {
        const response = await client.post(
            `${baseUrl}/api/v4/commands`,
            command,
        );

        return {command: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get slash commands available to a team.
 * @param {string} baseUrl - the base server URL
 * @param {string} teamId - the team ID
 * @return {Object} returns {commands} on success or {error, status} on error
 */
export const apiGetTeamCommands = async (baseUrl: string, teamId: string): Promise<TeamCommandsResult> => {
    const commands: SlashCommand[] = [];
    try {
        const response = await client.get(`${baseUrl}/api/v4/commands?team_id=${encodeURIComponent(teamId)}`);
        if (Array.isArray(response.data)) {
            commands.push(...response.data);
        }
    } catch {
        // The autocomplete endpoint below includes runtime/plugin commands.
    }

    try {
        const response = await client.get(`${baseUrl}/api/v4/teams/${encodeURIComponent(teamId)}/commands/autocomplete?page=0&per_page=200`);
        if (Array.isArray(response.data)) {
            commands.push(...response.data);
        }
        return {commands};
    } catch (err) {
        if (commands.length > 0) {
            return {commands};
        }
        return getResponseFromError(err);
    }
};

/**
 * Wait until an exact slash-command trigger is registered for a team.
 * @param {string} baseUrl - the base server URL
 * @param {string} teamId - the team ID
 * @param {string} trigger - command trigger without the leading slash
 * @param {Object} options - polling timeout and interval
 * @return {Object} returns the matching command
 */
export const waitForSlashCommandTrigger = async (
    baseUrl: string,
    teamId: string,
    trigger: string,
    {timeoutMs = 30000, intervalMs = 1000}: WaitForSlashCommandOptions = {},
): Promise<SlashCommand> => {
    const deadline = Date.now() + timeoutMs;
    let lastError = '';

    const poll = async (): Promise<SlashCommand> => {
        const result = await apiGetTeamCommands(baseUrl, teamId);
        if (Array.isArray(result.commands)) {
            const command = result.commands.find((item: SlashCommand) => item.trigger === trigger);
            if (command) {
                return command;
            }
            lastError = `${result.commands.length} commands returned`;
        } else {
            lastError = result.error?.message || `HTTP ${result.status ?? 'unknown'}`;
        }

        if (Date.now() >= deadline) {
            throw new Error(`Slash command /${trigger} was not registered for team ${teamId} within ${timeoutMs}ms (${lastError}).`);
        }

        await new Promise<void>((resolve) => {
            setTimeout(resolve, intervalMs);
        });
        return poll();
    };

    return poll();
};

export const Command = {
    apiCreateCommand,
    apiGetTeamCommands,
    waitForSlashCommandTrigger,
};

export default Command;

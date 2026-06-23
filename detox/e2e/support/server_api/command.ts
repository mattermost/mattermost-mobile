// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import client from './client';
import {getResponseFromError} from './common';

// ****************************************************************
// Commands (Slash Commands)
// See https://api.mattermost.com/#tag/commands
//
// Exported API function should have the following:
// - documented using JSDoc
// - meaningful description
// - match the referenced API endpoints
// - parameter/s defined by `@param`
// - return value defined by `@return`
// ****************************************************************

/**
 * Create a slash command.
 * See https://api.mattermost.com/#operation/CreateCommand
 * @param {string} baseUrl - the base server URL
 * @param {Object} command - command object to be created
 * @return {Object} returns {command} on success or {error, status} on error
 */
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

export const Command = {
    apiCreateCommand,
};

export default Command;

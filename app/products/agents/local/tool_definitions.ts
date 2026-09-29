// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {ToolDefinition} from 'react-native-litert-lm';

export const LOCAL_AGENT_TOOL_DEFINITIONS: ToolDefinition[] = [
    {
        name: 'find_channel',
        description: 'Search the user\'s joined channels, DMs and group messages by name. Returns up to 10 matches with id, display name, type and last activity.',
        parametersJson: JSON.stringify({
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Channel display name, name, or username fragment to search for',
                },
            },
            required: ['query'],
        }),
    },
    {
        name: 'read_channel',
        description: 'Read recent cached posts from a channel by id. Prefer find_channel first when you only know the name. Results are compact and may be incomplete.',
        parametersJson: JSON.stringify({
            type: 'object',
            properties: {
                channel_id: {
                    type: 'string',
                    description: 'Channel id returned by find_channel',
                },
                since_hours: {
                    type: 'number',
                    description: 'Optional: only include posts from the last N hours',
                },
            },
            required: ['channel_id'],
        }),
    },
    {
        name: 'get_user',
        description: 'Look up a user by id or username from the local cache. Returns display name, username, position and whether they are a bot.',
        parametersJson: JSON.stringify({
            type: 'object',
            properties: {
                user_id: {
                    type: 'string',
                    description: 'User id',
                },
                username: {
                    type: 'string',
                    description: 'Username without @',
                },
            },
        }),
    },
];

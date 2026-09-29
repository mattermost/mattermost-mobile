// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {findChannel} from './find_channel';
import {getUser} from './get_user';
import {readChannel} from './read_channel';

import type {ToolArgs, ToolResult} from './types';
import type {Database} from '@nozbe/watermelondb';

export type {ToolArgs, ToolResult};

export async function executeLocalTool(database: Database, name: string, args: ToolArgs): Promise<ToolResult> {
    switch (name) {
        case 'find_channel':
            return findChannel(database, args);
        case 'read_channel':
            return readChannel(database, args);
        case 'get_user':
            return getUser(database, args);
        default:
            return {
                forToolStep: `Unknown tool: ${name}`,
                forAnswer: `Unknown tool: ${name}`,
            };
    }
}

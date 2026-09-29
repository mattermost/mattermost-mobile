// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getUserById, queryUsersByUsername} from '@queries/servers/user';
import {displayUsername} from '@utils/user';

import type {ToolArgs, ToolResult} from './types';
import type {Database} from '@nozbe/watermelondb';

export async function getUser(database: Database, args: ToolArgs): Promise<ToolResult> {
    const userId = typeof args.user_id === 'string' ? args.user_id.trim() : '';
    const username = typeof args.username === 'string' ? args.username.trim().replace(/^@/, '') : '';

    if (!userId && !username) {
        return {
            forToolStep: 'Error: user_id or username is required',
            forAnswer: 'Error: user_id or username is required',
        };
    }

    let user = userId ? await getUserById(database, userId) : undefined;
    if (!user && username) {
        const matches = await queryUsersByUsername(database, [username]).fetch();
        user = matches[0];
    }

    if (!user) {
        const empty = `User not found (${userId || username}).`;
        return {forToolStep: empty, forAnswer: empty};
    }

    const line = [
        `id=${user.id}`,
        `username=@${user.username}`,
        `display_name=${displayUsername(user, 'en', '', false) || user.username}`,
        `position=${user.position || '-'}`,
        `bot=${user.isBot ? 'yes' : 'no'}`,
    ].join(' | ');

    return {forToolStep: line, forAnswer: line};
}

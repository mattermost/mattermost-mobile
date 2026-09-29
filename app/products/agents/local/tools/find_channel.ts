// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';

import {LOCAL_AGENT_FIND_CHANNEL_LIMIT} from '@agents/local/constants';
import {General} from '@constants';
import {MM_TABLES} from '@constants/database';
import {sanitizeLikeString} from '@helpers/database';

import type {ToolArgs, ToolResult} from './types';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type TeamModel from '@typings/database/models/servers/team';

const {CHANNEL, MY_CHANNEL, TEAM} = MM_TABLES.SERVER;

function channelTypeLabel(type: string): string {
    switch (type) {
        case General.OPEN_CHANNEL:
            return 'public';
        case General.PRIVATE_CHANNEL:
            return 'private';
        case General.DM_CHANNEL:
            return 'dm';
        case General.GM_CHANNEL:
            return 'gm';
        default:
            return type;
    }
}

export async function findChannel(database: Database, args: ToolArgs): Promise<ToolResult> {
    const query = typeof args.query === 'string' ? args.query.trim() : '';
    if (!query) {
        return {forToolStep: 'Error: query is required', forAnswer: 'Error: query is required'};
    }

    const like = `%${sanitizeLikeString(query.replace(/^@/, ''))}%`;
    const myChannels = await database.get<MyChannelModel>(MY_CHANNEL).query(
        Q.unsafeSqlQuery(
            `SELECT DISTINCT my.* FROM ${MY_CHANNEL} my
            INNER JOIN ${CHANNEL} c ON c.id = my.id AND c.delete_at = 0
            WHERE c.display_name LIKE '${like}' OR c.name LIKE '${like}'
            ORDER BY my.last_viewed_at DESC
            LIMIT ${LOCAL_AGENT_FIND_CHANNEL_LIMIT}`,
        ),
    ).fetch();

    if (myChannels.length === 0) {
        const empty = `No channels found for "${query}".`;
        return {forToolStep: empty, forAnswer: empty};
    }

    const channelIds = myChannels.map((my) => my.id);
    const channels = await database.get<ChannelModel>(CHANNEL).query(Q.where('id', Q.oneOf(channelIds))).fetch();
    const channelById = new Map(channels.map((channel) => [channel.id, channel]));

    const teamIds = [...new Set(channels.map((channel) => channel.teamId).filter(Boolean))];
    const teams = teamIds.length ? await database.get<TeamModel>(TEAM).query(Q.where('id', Q.oneOf(teamIds))).fetch() : [];
    const teamById = new Map(teams.map((team) => [team.id, team.displayName]));

    const lines: string[] = [];
    for (const my of myChannels) {
        const channel = channelById.get(my.id);
        if (!channel) {
            continue;
        }

        const teamName = channel.teamId ? (teamById.get(channel.teamId) || '') : '';
        const lastPost = my.lastPostAt ? new Date(my.lastPostAt).toISOString() : 'never';
        lines.push(
            `${channel.id} | ${channel.displayName} | ${channelTypeLabel(channel.type)} | team=${teamName || '-'} | last_post=${lastPost}`,
        );
    }

    const body = lines.length ? lines.join('\n') : `No channels found for "${query}".`;
    return {forToolStep: body, forAnswer: body};
}

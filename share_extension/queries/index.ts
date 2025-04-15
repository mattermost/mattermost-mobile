// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {of as of$, switchMap} from 'rxjs';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getAllServers} from '@queries/app/servers';

import type ChannelModel from '@typings/database/models/servers/channel';

const {SERVER: {CHANNEL}} = MM_TABLES;

export const queryHasChannels = (serverUrl: string) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        return database.get<ChannelModel>(CHANNEL).query(
            Q.unsafeSqlQuery('SELECT DISTINCT c.* FROM Channel c \
            INNER JOIN MyChannel my ON c.id=my.id AND c.delete_at = 0 \
            INNER JOIN Team t ON c.team_id=t.id',
            ),
        );
    } catch (e) {
        return undefined;
    }
};

export const getServerHasChannels = async (serverUrl: string) => {
    const channelsCount = await queryHasChannels(serverUrl)?.fetch();
    return (channelsCount?.length ?? 0) > 0;
};

export const observeServerHasChannels = (serverUrl: string) => {
    return queryHasChannels(serverUrl)?.observe().pipe(
        switchMap((channels) => of$(channels.length > 0)),
    ) || of$(false);
};

export const hasChannels = async () => {
    try {
        const servers = await getAllServers();
        const activeSrvers = servers.filter((s) => s.identifier && s.lastActiveAt);
        const promises: Array<Promise<boolean>> = [];
        for (const active of activeSrvers) {
            promises.push(getServerHasChannels(active.url));
        }
        const result = await Promise.all(promises);
        return result.some((r) => r);
    } catch {
        return false;
    }
};

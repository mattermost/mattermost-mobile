// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {map as map$, Subscription} from 'rxjs';
import {combineLatestWith} from 'rxjs/operators';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {observeAllMyChannelNotifyProps} from '@queries/servers/channel';
import {queryMyTeams} from '@queries/servers/team';
import {getIsCRTEnabled, observeThreadMentionCount, queryThreads, observeUnreadsAndMentions} from '@queries/servers/thread';

import type MyChannelModel from '@typings/database/models/servers/my_channel';

const {SERVER: {CHANNEL, MY_CHANNEL}} = MM_TABLES;

export type UnreadObserverArgs = {
    myChannels: MyChannelModel[];
    settings?: Record<string, Partial<ChannelNotifyProps>>;
    threadUnreads?: boolean;
    threadMentionCount: number;
}

type ServerUnreadObserver = {
    (serverUrl: string, {myChannels, settings, threadMentionCount, threadUnreads}: UnreadObserverArgs): void;
}

type UnreadObserver = {
    ({myChannels, settings, threadMentionCount, threadUnreads}: UnreadObserverArgs): void;
}

export const subscribeServerUnreadAndMentions = (serverUrl: string, observer: UnreadObserver) => {
    const server = DatabaseManager.serverDatabases[serverUrl];
    let subscription: Subscription|undefined;

    if (server?.database) {
        subscription = server.database.
            get<MyChannelModel>(MY_CHANNEL).
            query(Q.on(CHANNEL, Q.where('delete_at', Q.eq(0)))).
            observeWithColumns(['is_unread', 'mentions_count']).
            pipe(
                combineLatestWith(observeAllMyChannelNotifyProps(server.database)),
                combineLatestWith(observeUnreadsAndMentions(server.database, {includeDmGm: true})),
                map$(([[myChannels, settings], {unreads, mentions}]) => ({myChannels, settings, threadUnreads: unreads, threadMentionCount: mentions})),
            ).
            subscribe(observer);
    }

    return subscription;
};

export const subscribeMentionsByServer = (serverUrl: string, observer: ServerUnreadObserver) => {
    const server = DatabaseManager.serverDatabases[serverUrl];
    let subscription: Subscription|undefined;

    if (server?.database) {
        subscription = server.database.
            get<MyChannelModel>(MY_CHANNEL).
            query(Q.on(CHANNEL, Q.where('delete_at', Q.eq(0)))).
            observeWithColumns(['mentions_count']).
            pipe(
                combineLatestWith(observeThreadMentionCount(server.database, {includeDmGm: true})),
                map$(([myChannels, threadMentionCount]) => ({myChannels, threadMentionCount})),
            ).
            subscribe(observer.bind(undefined, serverUrl));
    }

    return subscription;
};

export const subscribeUnreadAndMentionsByServer = (serverUrl: string, observer: ServerUnreadObserver) => {
    const server = DatabaseManager.serverDatabases[serverUrl];
    let subscription: Subscription|undefined;

    if (server?.database) {
        subscription = server.database.get<MyChannelModel>(MY_CHANNEL).
            query(Q.on(CHANNEL, Q.where('delete_at', Q.eq(0)))).
            observeWithColumns(['mentions_count', 'is_unread']).
            pipe(
                combineLatestWith(observeAllMyChannelNotifyProps(server.database)),
                combineLatestWith(observeUnreadsAndMentions(server.database, {includeDmGm: true})),
                map$(([[myChannels, settings], {unreads, mentions}]) => ({myChannels, settings, threadUnreads: unreads, threadMentionCount: mentions})),
            ).
            subscribe(observer.bind(undefined, serverUrl));
    }

    return subscription;
};

export const getTotalMentionsForServer = async (serverUrl: string) => {
    const server = DatabaseManager.serverDatabases[serverUrl];
    let count = 0;
    if (server?.database) {
        const {database} = server;
        const myChannels = await database.get<MyChannelModel>(MY_CHANNEL).
            query(
                Q.on(CHANNEL, Q.where('delete_at', Q.eq(0))),
                Q.where('mentions_count', Q.gt(0)),
            ).fetch();

        for (const mc of myChannels) {
            count += mc.mentionsCount;
        }

        const isCRTEnabled = await getIsCRTEnabled(database);
        if (isCRTEnabled) {
            let includeDmGm = true;
            const myTeamIds = await queryMyTeams(database).fetchIds();
            for await (const teamId of myTeamIds) {
                const threads = await queryThreads(database, {teamId, includeDmGm}).extend(
                    Q.where('unread_mentions', Q.gt(0)),
                ).fetch();
                includeDmGm = false;
                for (const t of threads) {
                    count += t.unreadMentions;
                }
            }
        }
    }

    return count;
};

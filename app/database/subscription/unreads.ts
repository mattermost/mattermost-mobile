// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';

import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type {Subscription} from 'rxjs';

const {SERVER: {CHANNEL, MY_CHANNEL}} = MM_TABLES;

export const subscribeServerUnreadAndMentions = (serverUrl: string, observer: (myChannels: MyChannelModel[]) => void) => {
    const server = DatabaseManager.serverDatabases[serverUrl];
    let subscription: Subscription|undefined;

    if (server?.database) {
        subscription = server.database.get<MyChannelModel>(MY_CHANNEL).
            query(Q.on(CHANNEL, Q.where('delete_at', Q.eq(0)))).
            observeWithColumns(['is_unread', 'mentions_count']).
            subscribe(observer);
    }

    return subscription;
};

export const subscribeMentionsByServer = (serverUrl: string, observer: (serverUrl: string, myChannels: MyChannelModel[]) => void) => {
    const server = DatabaseManager.serverDatabases[serverUrl];
    let subscription: Subscription|undefined;
    if (server?.database) {
        subscription = server.database.
            get(MY_CHANNEL).
            query(Q.on(CHANNEL, Q.where('delete_at', Q.eq(0)))).
            observeWithColumns(['mentions_count']).
            subscribe(observer.bind(undefined, serverUrl));
    }

    return subscription;
};

export const subscribeUnreadAndMentionsByServer = (serverUrl: string, observer: (serverUrl: string, myChannels: MyChannelModel[]) => void) => {
    const server = DatabaseManager.serverDatabases[serverUrl];
    let subscription: Subscription|undefined;
    if (server?.database) {
        subscription = server.database.
            get(MY_CHANNEL).
            query(Q.on(CHANNEL, Q.where('delete_at', Q.eq(0)))).
            observeWithColumns(['mentions_count', 'has_unreads']).
            subscribe(observer.bind(undefined, serverUrl));
    }

    return subscription;
};

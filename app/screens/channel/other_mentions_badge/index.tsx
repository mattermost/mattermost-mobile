// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import Badge from '@components/badge';
import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';

import type ServersModel from '@typings/database/models/app/servers';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type {Subscription} from 'rxjs';

type UnreadSubscription = {
    mentions: number;
    subscription?: Subscription;
}

type Props = {
    channelId: string;
}

const styles = StyleSheet.create({
    badge: {
        left: 2,
        position: 'relative',
        top: 0,
    },
});

const {SERVERS} = MM_TABLES.APP;
const {CHANNEL, MY_CHANNEL} = MM_TABLES.SERVER;
const subscriptions: Map<string, UnreadSubscription> = new Map();

const OtherMentionsBadge = ({channelId}: Props) => {
    const db = DatabaseManager.appDatabase?.database;
    const [count, setCount] = useState(0);

    const updateCount = () => {
        let mentions = 0;
        subscriptions.forEach((value) => {
            mentions += value.mentions;
        });
        setCount(mentions);
    };

    const unreadsSubscription = (serverUrl: string, myChannels: MyChannelModel[]) => {
        const unreads = subscriptions.get(serverUrl);
        if (unreads) {
            let mentions = 0;
            myChannels.forEach((myChannel) => {
                if (channelId !== myChannel.id) {
                    mentions += myChannel.mentionsCount;
                }
            });

            unreads.mentions = mentions;
            subscriptions.set(serverUrl, unreads);
            updateCount();
        }
    };

    const serversObserver = async (servers: ServersModel[]) => {
        servers.forEach((server) => {
            const serverUrl = server.url;
            if (server.lastActiveAt) {
                const sdb = DatabaseManager.serverDatabases[serverUrl];
                if (sdb?.database) {
                    if (!subscriptions.has(serverUrl)) {
                        const unreads: UnreadSubscription = {
                            mentions: 0,
                        };
                        subscriptions.set(serverUrl, unreads);
                        unreads.subscription = sdb.database.
                            get(MY_CHANNEL).
                            query(Q.on(CHANNEL, Q.where('delete_at', Q.eq(0)))).
                            observeWithColumns(['mentions_count']).
                            subscribe(unreadsSubscription.bind(undefined, serverUrl));
                    }
                }

                // subscribe and listen for mentions
            } else if (subscriptions.has(serverUrl)) {
                // logout from server, remove the subscription
                subscriptions.delete(serverUrl);
            }
        });
    };

    useEffect(() => {
        const subscription = db?.
            get(SERVERS).
            query().
            observeWithColumns(['last_active_at']).
            subscribe(serversObserver);

        return () => {
            subscription?.unsubscribe();
            subscriptions.forEach((unreads) => {
                unreads.subscription?.unsubscribe();
            });
        };
    }, []);

    return (
        <View>
            <Badge
                type='Small'
                visible={count > 0}
                value={count}
                style={styles.badge}
                borderColor='transparent'
            />
        </View>
    );
};

export default OtherMentionsBadge;

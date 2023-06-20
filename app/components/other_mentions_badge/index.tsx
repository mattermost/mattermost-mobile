// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import Badge from '@components/badge';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {subscribeAllServers} from '@database/subscription/servers';
import {subscribeMentionsByServer} from '@database/subscription/unreads';

import type ServersModel from '@typings/database/models/app/servers';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type {UnreadSubscription} from '@typings/database/subscriptions';

type Props = {
    channelId: string;
}

const styles = StyleSheet.create({
    container: {
        minWidth: 24,
    },
    badge: {
        left: 2,
        position: 'relative',
        top: 0,
    },
});

const OtherMentionsBadge = ({channelId}: Props) => {
    const currentServerUrl = useServerUrl();
    const subscriptions: Map<string, UnreadSubscription> = useRef(new Map()).current;
    const [count, setCount] = useState(0);

    const updateCount = () => {
        let mentions = 0;
        subscriptions.forEach((value) => {
            mentions += value.mentions;
        });
        setCount(mentions);
    };

    const unreadsSubscription = (serverUrl: string, {myChannels, threadMentionCount}: {myChannels: MyChannelModel[]; threadMentionCount: number}) => {
        const unreads = subscriptions.get(serverUrl);
        if (unreads) {
            let mentions = 0;
            for (const myChannel of myChannels) {
                if (channelId !== myChannel.id) {
                    mentions += myChannel.mentionsCount;
                }
            }

            unreads.mentions = mentions;
            if (serverUrl !== currentServerUrl || channelId !== Screens.GLOBAL_THREADS) {
                unreads.mentions += threadMentionCount;
            }
            subscriptions.set(serverUrl, unreads);
            updateCount();
        }
    };

    const serversObserver = async (servers: ServersModel[]) => {
        // unsubscribe mentions from servers that were removed
        const allUrls = new Set(servers.map((s) => s.url));
        const subscriptionsToRemove = [...subscriptions].filter(([key]) => !allUrls.has(key));
        for (const [key, map] of subscriptionsToRemove) {
            map.subscription?.unsubscribe();
            subscriptions.delete(key);
        }

        for (const server of servers) {
            const serverUrl = server.url;
            if (server.lastActiveAt && !subscriptions.has(serverUrl)) {
                const unreads: UnreadSubscription = {
                    mentions: 0,
                    unread: false,
                };
                subscriptions.set(serverUrl, unreads);
                unreads.subscription = subscribeMentionsByServer(serverUrl, unreadsSubscription);
            } else if (subscriptions.has(serverUrl)) {
                subscriptions.get(serverUrl)?.subscription?.unsubscribe();
                subscriptions.delete(serverUrl);
            }
        }
    };

    useEffect(() => {
        const subscription = subscribeAllServers(serversObserver);

        return () => {
            subscription?.unsubscribe();
            subscriptions.forEach((unreads) => {
                unreads.subscription?.unsubscribe();
            });
            subscriptions.clear();
        };
    }, []);

    return (
        <View style={styles.container}>
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

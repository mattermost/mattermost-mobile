// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet} from 'react-native';

import ServerIcon from '@components/server_icon';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {subscribeAllServers} from '@database/subscription/servers';
import {subscribeUnreadAndMentionsByServer} from '@database/subscription/unreads';
import {useIsTablet} from '@hooks/device';
import {bottomSheet} from '@screens/navigation';

import ServerList from './servers_list';

import type ServersModel from '@typings/database/models/app/servers';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type {UnreadMessages, UnreadSubscription} from '@typings/database/subscriptions';

const subscriptions: Map<string, UnreadSubscription> = new Map();

const styles = StyleSheet.create({
    icon: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        zIndex: 10,
        top: 10,
        left: 16,
        width: 40,
        height: 40,
    },
});

export default function Servers() {
    const intl = useIntl();
    const [total, setTotal] = useState<UnreadMessages>({mentions: 0, unread: false});
    const registeredServers = useRef<ServersModel[]|undefined>();
    const currentServerUrl = useServerUrl();
    const isTablet = useIsTablet();
    const theme = useTheme();

    const updateTotal = () => {
        let unread = false;
        let mentions = 0;
        subscriptions.forEach((value) => {
            unread = unread || value.unread;
            mentions += value.mentions;
        });
        setTotal({mentions, unread});
    };

    const unreadsSubscription = (serverUrl: string, myChannels: MyChannelModel[]) => {
        const unreads = subscriptions.get(serverUrl);
        if (unreads) {
            let mentions = 0;
            let unread = false;
            for (const myChannel of myChannels) {
                mentions += myChannel.mentionsCount;
                unread = unread || myChannel.isUnread;
            }

            unreads.mentions = mentions;
            unreads.unread = unread;
            subscriptions.set(serverUrl, unreads);
            updateTotal();
        }
    };

    const serversObserver = async (servers: ServersModel[]) => {
        registeredServers.current = servers;

        // unsubscribe mentions from servers that were removed
        const allUrls = servers.map((s) => s.url);
        const subscriptionsToRemove = [...subscriptions].filter(([key]) => allUrls.indexOf(key) === -1);
        for (const [key, map] of subscriptionsToRemove) {
            map.subscription?.unsubscribe();
            subscriptions.delete(key);
        }

        for (const server of servers) {
            const {lastActiveAt, url} = server;
            if (lastActiveAt && url !== currentServerUrl && !subscriptions.has(url)) {
                const unreads: UnreadSubscription = {
                    mentions: 0,
                    unread: false,
                };
                subscriptions.set(url, unreads);
                unreads.subscription = subscribeUnreadAndMentionsByServer(url, unreadsSubscription);
            } else if (subscriptions.has(url)) {
                subscriptions.get(url)?.subscription?.unsubscribe();
                subscriptions.delete(url);
            }
        }
    };

    const onPress = useCallback(() => {
        if (registeredServers.current?.length) {
            const renderContent = () => {
                return (
                    <ServerList servers={registeredServers.current!}/>
                );
            };

            const snapPoints = ['50%', 10];
            if (registeredServers.current.length > 3) {
                snapPoints[0] = '90%';
            }

            const closeButtonId = 'close-your-servers';
            bottomSheet({
                closeButtonId,
                renderContent,
                snapPoints,
                theme,
                title: intl.formatMessage({id: 'servers.create_button', defaultMessage: 'Add a server'}),
            });
        }
    }, [isTablet, theme]);

    useEffect(() => {
        const subscription = subscribeAllServers(serversObserver);

        return () => {
            subscription?.unsubscribe();
            subscriptions.forEach((unreads) => {
                unreads.subscription?.unsubscribe();
            });
        };
    }, []);

    return (
        <ServerIcon
            hasUnreads={total.unread}
            mentionCount={total.mentions}
            onPress={onPress}
            style={styles.icon}
        />
    );
}


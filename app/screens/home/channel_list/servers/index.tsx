// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet} from 'react-native';

import ServerIcon from '@components/server_icon';
import {MM_TABLES} from '@constants/database';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import {useIsTablet} from '@hooks/device';
import {bottomSheet} from '@screens/navigation';

import ServerList from './servers_list';

import type ServersModel from '@typings/database/models/app/servers';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type {Subscription} from 'rxjs';

type UnreadMessages = {
    mentions: number;
    unread: boolean;
};

type UnreadSubscription = UnreadMessages & {
    subscription?: Subscription;
}

const {SERVERS} = MM_TABLES.APP;
const {CHANNEL, MY_CHANNEL} = MM_TABLES.SERVER;
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
    const db = DatabaseManager.appDatabase?.database;
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
            myChannels.forEach((myChannel) => {
                mentions += myChannel.mentionsCount;
                unread = unread || myChannel.isUnread;
            });

            unreads.mentions = mentions;
            unreads.unread = unread;
            subscriptions.set(serverUrl, unreads);
            updateTotal();
        }
    };

    const serversObserver = async (servers: ServersModel[]) => {
        registeredServers.current = servers;
        servers.forEach((server) => {
            const {lastActiveAt, url} = server;
            if (lastActiveAt && url !== currentServerUrl) {
                const sdb = DatabaseManager.serverDatabases[url];
                if (sdb?.database) {
                    if (!subscriptions.has(url)) {
                        const unreads: UnreadSubscription = {
                            mentions: 0,
                            unread: false,
                        };
                        subscriptions.set(url, unreads);
                        unreads.subscription = sdb.database.
                            get(MY_CHANNEL).
                            query(Q.on(CHANNEL, Q.where('delete_at', Q.eq(0)))).
                            observeWithColumns(['mentions_count', 'has_unreads']).
                            subscribe(unreadsSubscription.bind(undefined, url));
                    }
                }

                // subscribe and listen for unreads and mentions
            } else if (subscriptions.has(url)) {
                // logout from server, remove the subscription
                subscriptions.delete(url);
            }
        });
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
                title: intl.formatMessage({id: 'servers.create_button', defaultMessage: 'Add a Server'}),
            });
        }
    }, [isTablet, theme, registeredServers.current]);

    useEffect(() => {
        const subscription = db?.
            get(SERVERS).
            query(Q.sortBy('display_name', Q.asc)).
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
        <ServerIcon
            hasUnreads={total.unread}
            mentionCount={total.mentions}
            onPress={onPress}
            style={styles.icon}
        />
    );
}


// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {Notifications} from 'react-native-notifications';

import Badge from '@components/badge';
import CompassIcon from '@components/compass_icon';
import {BOTTOM_TAB_ICON_SIZE} from '@constants/view';
import {subscribeAllServers} from '@database/subscription/servers';
import {subscribeUnreadAndMentionsByServer, UnreadObserverArgs} from '@database/subscription/unreads';
import {useAppState} from '@hooks/device';
import NativeNotification from '@notifications';
import {logDebug} from '@utils/log';
import {changeOpacity} from '@utils/theme';

import type ServersModel from '@typings/database/models/app/servers';
import type {UnreadMessages, UnreadSubscription} from '@typings/database/subscriptions';

type Props = {
    isFocused: boolean;
    theme: Theme;
}

const subscriptions: Map<string, UnreadSubscription> = new Map();

const style = StyleSheet.create({
    unread: {
        left: 19,
        top: 4,
    },
    mentionsOneDigit: {
        left: 12,
    },
    mentionsTwoDigits: {
        left: 13,
    },
    mentionsThreeDigits: {
        left: 10,
    },
});

const Home = ({isFocused, theme}: Props) => {
    const [total, setTotal] = useState<UnreadMessages>({mentions: 0, unread: false});
    const appState = useAppState();

    const updateTotal = () => {
        let unread = false;
        let mentions = 0;
        subscriptions.forEach((value) => {
            unread = unread || value.unread;
            mentions += value.mentions;
        });
        setTotal({mentions, unread});

        if (Platform.OS === 'ios') {
            NativeNotification.getDeliveredNotifications().then((delivered) => {
                if (mentions === 0 && delivered.length > 0) {
                    logDebug('Not updating badge count, since we have no mentions in the database, and the number of notifications in the notification center is', delivered.length);
                    return;
                }

                logDebug('Setting the badge count based on database values to', mentions);
                Notifications.ios.setBadgeCount(mentions);
            });
        }
    };

    const unreadsSubscription = (serverUrl: string, {myChannels, settings, threadMentionCount}: UnreadObserverArgs) => {
        const unreads = subscriptions.get(serverUrl);
        if (unreads) {
            let mentions = 0;
            let unread = false;
            for (const myChannel of myChannels) {
                const isMuted = settings?.[myChannel.id]?.mark_unread === 'mention';
                mentions += isMuted ? 0 : myChannel.mentionsCount;
                unread = unread || (myChannel.isUnread && !isMuted);
            }

            unreads.mentions = mentions + threadMentionCount;
            unreads.unread = unread;
            subscriptions.set(serverUrl, unreads);
            updateTotal();
        }
    };

    const serversObserver = async (servers: ServersModel[]) => {
        // unsubscribe mentions from servers that were removed
        const allUrls = new Set(servers.map((s) => s.url));
        const subscriptionsToRemove = [...subscriptions].filter(([key]) => !allUrls.has(key));
        for (const [key, map] of subscriptionsToRemove) {
            map.subscription?.unsubscribe();
            subscriptions.delete(key);
            updateTotal();
        }

        for (const server of servers) {
            const {lastActiveAt, url} = server;
            if (lastActiveAt && !subscriptions.has(url)) {
                const unreads: UnreadSubscription = {
                    mentions: 0,
                    unread: false,
                };
                subscriptions.set(url, unreads);
                unreads.subscription = subscribeUnreadAndMentionsByServer(url, unreadsSubscription);
            } else if (!lastActiveAt && subscriptions.has(url)) {
                subscriptions.get(url)?.subscription?.unsubscribe();
                subscriptions.delete(url);
                updateTotal();
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

    useEffect(() => {
        if (appState === 'background') {
            updateTotal();
        }
    }, [appState]);

    let unreadStyle;
    if (total.mentions) {
        unreadStyle = style.mentionsOneDigit;
        if (total.mentions > 9) {
            unreadStyle = style.mentionsTwoDigits;
        } else if (total.mentions > 99) {
            unreadStyle = style.mentionsThreeDigits;
        }
    } else if (total.unread) {
        unreadStyle = style.unread;
    }

    return (
        <View>
            <CompassIcon
                size={BOTTOM_TAB_ICON_SIZE}
                name='home-variant-outline'
                color={isFocused ? theme.buttonBg : changeOpacity(theme.centerChannelColor, 0.48)}
            />
            <Badge
                backgroundColor={theme.buttonBg}
                borderColor={theme.centerChannelBg}
                color={theme.buttonColor}
                style={unreadStyle}
                visible={!isFocused && Boolean(unreadStyle)}
                type='Small'
                value={total.mentions || (total.unread ? -1 : 0)}
            />
        </View>
    );
};

export default Home;

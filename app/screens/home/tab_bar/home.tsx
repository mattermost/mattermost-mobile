// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils from '@mattermost/rnutils/src';
import React, {useState} from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {Notifications} from 'react-native-notifications';

import Badge from '@components/badge';
import CompassIcon from '@components/compass_icon';
import {BOTTOM_TAB_ICON_SIZE} from '@constants/view';
import {subscribeAllServers} from '@database/subscription/servers';
import {observeUnreadsByServer} from '@database/subscription/unreads';
import {useAppState} from '@hooks/device';
import useDidMount from '@hooks/did_mount';
import useDidUpdate from '@hooks/did_update';
import {logDebug} from '@utils/log';
import {changeOpacity} from '@utils/theme';

import type ServersModel from '@typings/database/models/app/servers';
import type {UnreadMessages, UnreadSubscription} from '@typings/database/subscriptions';

type Props = {
    isFocused: boolean;
    theme: Theme;
}

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

const totalFromSubscriptions = (subs: Map<string, UnreadSubscription>) => {
    let unread = false;
    let mentions = 0;
    subs.forEach((value) => {
        unread = unread || value.unread;
        mentions += value.mentions;
    });
    return {unread, mentions};
};

const updateBadge = (subs: Map<string, UnreadSubscription>) => {
    if (Platform.OS !== 'ios') {
        return;
    }
    const {mentions} = totalFromSubscriptions(subs);
    RNUtils.getDeliveredNotifications().then((delivered) => {
        if (mentions === 0 && delivered.length > 0) {
            logDebug('Not updating badge count, since we have no mentions in the database, and the number of notifications in the notification center is', delivered.length);
            return;
        }

        logDebug('Setting the badge count based on database values to', mentions);
        Notifications.ios.setBadgeCount(mentions);
    });
};

const Home = ({isFocused, theme}: Props) => {
    const [total, setTotal] = useState<UnreadMessages>({mentions: 0, unread: false});
    const appState = useAppState();

    // Each Home instance keeps its own subscriptions map. The TabBar can mount
    // multiple Home instances simultaneously (e.g. when withServerDatabase remounts
    // the authenticated subtree during a server switch), so sharing a module-level
    // map would let one instance's serversObserver no-op for another instance.
    const subscriptionsRef = React.useRef<Map<string, UnreadSubscription>>(new Map());

    useDidMount(() => {
        const subs = subscriptionsRef.current;

        const emitTotal = () => {
            setTotal((prev) => {
                const newTotal = totalFromSubscriptions(subs);
                if (prev.mentions === newTotal.mentions && prev.unread === newTotal.unread) {
                    return prev;
                }
                return newTotal;
            });
        };

        const serversObserver = (servers: ServersModel[]) => {
            const allUrls = new Set(servers.map((s) => s.url));

            // Drop subscriptions for servers that were removed from the table.
            for (const [key, value] of [...subs]) {
                if (!allUrls.has(key)) {
                    value.subscription?.unsubscribe();
                    subs.delete(key);
                }
            }

            for (const server of servers) {
                const {lastActiveAt, url} = server;
                if (lastActiveAt && !subs.has(url)) {
                    const unreads: UnreadSubscription = {
                        mentions: 0,
                        unread: false,
                    };
                    subs.set(url, unreads);
                    unreads.subscription = observeUnreadsByServer(url).subscribe(({mentions, unread}) => {
                        unreads.mentions = mentions;
                        unreads.unread = unread;
                        emitTotal();
                    });
                } else if (!lastActiveAt && subs.has(url)) {
                    subs.get(url)?.subscription?.unsubscribe();
                    subs.delete(url);
                }
            }

            // After any add/remove pass, recompute the total so the badge reflects
            // the current set of subscriptions even when no per-server emission fires.
            emitTotal();
        };

        const subscription = subscribeAllServers(serversObserver);

        return () => {

            subscription?.unsubscribe();

            // Snapshot current totals BEFORE clearing so the iOS badge reflects
            // the real mention count from the DB, not zero.
            updateBadge(subs);

            subs.forEach((unreads) => {
                unreads.subscription?.unsubscribe();
            });
            subs.clear();
        };
    });

    useDidUpdate(() => {
        if (appState !== 'active') {
            updateBadge(subscriptionsRef.current);
        }
    }, [total, appState !== 'active']);

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

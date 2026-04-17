// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useImperativeHandle, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, type StyleProp, type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import ServerIcon from '@components/server_icon';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {subscribeAllServers} from '@database/subscription/servers';
import {observeUnreadsByServer} from '@database/subscription/unreads';
import {useWindowDimensions} from '@hooks/device';
import useDidMount from '@hooks/did_mount';
import {BUTTON_HEIGHT, TITLE_HEIGHT} from '@screens/bottom_sheet';
import {bottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {sortServersByDisplayName} from '@utils/server';

import ServerList, {AddServerButton} from './servers_list';

import type ServersModel from '@typings/database/models/app/servers';
import type {UnreadMessages, UnreadSubscription} from '@typings/database/subscriptions';

export type ServersRef = {
    openServers: () => void;
}

export const SERVER_ITEM_HEIGHT = 75;
export const PUSH_ALERT_TEXT_HEIGHT = 42;

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

type Props = {
    badgeBorderColor?: string;
    iconColor?: string;
    iconStyle?: StyleProp<ViewStyle>;
    testID?: string;
}

const Servers = React.forwardRef<ServersRef, Props>(({
    badgeBorderColor,
    iconColor,
    iconStyle = styles.icon,
    testID = 'channel_list.servers.server_icon',
}, ref) => {
    const intl = useIntl();
    const [total, setTotal] = useState<UnreadMessages>({mentions: 0, unread: false});
    const registeredServers = useRef<ServersModel[]|undefined>(undefined);
    const subscriptions = useRef<Map<string, UnreadSubscription>>(new Map()).current;
    const currentServerUrl = useServerUrl();
    const dimensions = useWindowDimensions();
    const insets = useSafeAreaInsets();
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

    const serversObserver = async (servers: ServersModel[]) => {
        registeredServers.current = sortServersByDisplayName(servers, intl);

        // Unsubscribe from servers no longer in the registry and refresh the
        // badge so their last-seen counts stop contributing.
        const allUrls = new Set(servers.map((s) => s.url));
        const subscriptionsToRemove = [...subscriptions].filter(([key]) => !allUrls.has(key));
        for (const [key, map] of subscriptionsToRemove) {
            map.subscription?.unsubscribe();
            subscriptions.delete(key);
        }
        if (subscriptionsToRemove.length) {
            updateTotal();
        }

        for (const server of servers) {
            const {lastActiveAt, url, persistenceFlag} = server;
            const isWiped = persistenceFlag === 'wiped';
            const shouldSubscribe = Boolean(lastActiveAt) && !isWiped && url !== currentServerUrl;

            if (shouldSubscribe && !subscriptions.has(url)) {
                const unreads: UnreadSubscription = {mentions: 0, unread: false};
                subscriptions.set(url, unreads);
                unreads.subscription = observeUnreadsByServer(url).subscribe(({mentions, unread}) => {
                    unreads.mentions = mentions;
                    unreads.unread = unread;
                    subscriptions.set(url, unreads);
                    updateTotal();
                });
            } else if (!shouldSubscribe && subscriptions.has(url)) {
                subscriptions.get(url)?.subscription?.unsubscribe();
                subscriptions.delete(url);
                updateTotal();
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
            const maxScreenHeight = Math.ceil(0.6 * dimensions.height);
            const maxSnapPoint = Math.min(
                maxScreenHeight,
                bottomSheetSnapPoint(registeredServers.current.length, SERVER_ITEM_HEIGHT) + TITLE_HEIGHT + BUTTON_HEIGHT + insets.bottom +
                    (registeredServers.current.filter((s: ServersModel) => s.lastActiveAt).length * PUSH_ALERT_TEXT_HEIGHT),
            );

            const snapPoints: Array<string | number> = [
                1,
                maxSnapPoint,
            ];
            if (maxSnapPoint === maxScreenHeight) {
                snapPoints.push('80%');
            }

            bottomSheet(renderContent, snapPoints, AddServerButton);
        }
    }, [dimensions.height, insets.bottom]);

    useImperativeHandle(ref, () => ({
        openServers: onPress,
    }), [onPress]);

    useDidMount(() => {
        const subscription = subscribeAllServers(serversObserver);

        return () => {
            subscription?.unsubscribe();
            subscriptions.forEach((unreads) => {
                unreads.subscription?.unsubscribe();
            });
            subscriptions.clear();
        };
    });

    return (
        <ServerIcon
            hasUnreads={total.unread}
            mentionCount={total.mentions}
            onPress={onPress}
            style={iconStyle}
            testID={testID}
            iconColor={iconColor}
            badgeBorderColor={badgeBorderColor ?? theme.sidebarBg}
            badgeBackgroundColor={theme.mentionBg}
            badgeColor={theme.mentionColor}
        />
    );
});

Servers.displayName = 'Servers';

export default Servers;

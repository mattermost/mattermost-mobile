// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {AppState, Dimensions, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {reconnectErasedServer} from '@actions/remote/ephemeral_mode/reconnect';
import Button from '@components/button';
import FormattedText from '@components/formatted_text';
import Alert from '@components/illustrations/alert';
import ServerIcon from '@components/server_icon';
import {useTheme} from '@context/theme';
import {subscribeAllServers} from '@database/subscription/servers';
import {subscribeUnreadAndMentionsByServer, type UnreadObserverArgs} from '@database/subscription/unreads';
import {useIsTablet} from '@hooks/device';
import useDidMount from '@hooks/did_mount';
import {usePreventDoubleTap} from '@hooks/utils';
import {BUTTON_HEIGHT, TITLE_HEIGHT} from '@screens/bottom_sheet';
import {PUSH_ALERT_TEXT_HEIGHT, SERVER_ITEM_HEIGHT} from '@screens/home/channel_list/servers';
import ServerList, {AddServerButton} from '@screens/home/channel_list/servers/servers_list';
import {bottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {sortServersByDisplayName} from '@utils/server';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type ServersModel from '@typings/database/models/app/servers';
import type {UnreadMessages, UnreadSubscription} from '@typings/database/subscriptions';

export interface DataErasedProps {
    serverUrl: string;
    displayName: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.centerChannelBg,
    },
    alertContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 24,
        maxWidth: 600,
        alignSelf: 'center',
    },
    boldText: {
        ...typography('Body', 100, 'SemiBold'),
        lineHeight: 20,
    },
    icon: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        zIndex: 10,
        left: 16,
        width: 40,
        height: 40,
    },
    iconWrapper: {
        height: 120,
        width: 120,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: theme.centerChannelColor,
        marginTop: 24,
        textAlign: 'center',
        ...typography('Heading', 800),
    },
    description: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
        textAlign: 'center',
        marginTop: 12,
        ...typography('Body', 200, 'Regular'),
    },
    buttonContainer: {
        marginTop: 32,
        width: '100%',
    },
    error: {
        color: theme.errorTextColor,
        textAlign: 'center',
        marginTop: 16,
        ...typography('Body', 100, 'Regular'),
    },
}));

const DataErased = ({serverUrl, displayName}: DataErasedProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);
    const insets = useSafeAreaInsets();
    const registeredServers = useRef<ServersModel[]|undefined>(undefined);
    const subscriptions = useRef<Map<string, UnreadSubscription>>(new Map());
    const isTablet = useIsTablet();
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [total, setTotal] = useState<UnreadMessages>({mentions: 0, unread: false});

    useDidMount(() => {
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                setHasError(false);
            }
        });
        return () => sub.remove();
    });

    const updateTotal = () => {
        let unread = false;
        let mentions = 0;
        subscriptions.current.forEach((value) => {
            unread = unread || value.unread;
            mentions += value.mentions;
        });
        setTotal({mentions, unread});
    };

    const unreadsSubscription = (url: string, {myChannels, settings, threadMentionCount, threadUnreads}: UnreadObserverArgs) => {
        const unreads = subscriptions.current.get(url);
        if (unreads) {
            let mentions = 0;
            let unread = Boolean(threadUnreads);
            for (const myChannel of myChannels) {
                const isMuted = settings?.[myChannel.id]?.mark_unread === 'mention';
                mentions += isMuted ? 0 : myChannel.mentionsCount;
                unread = unread || (myChannel.isUnread && !isMuted);
            }

            unreads.mentions = mentions + threadMentionCount;
            unreads.unread = unread;
            subscriptions.current.set(url, unreads);
            updateTotal();
        }
    };

    const serversObserver = (servers: ServersModel[]) => {
        registeredServers.current = sortServersByDisplayName(servers, intl);

        const allUrls = new Set(servers.map((s) => s.url));
        const subscriptionsToRemove = [...subscriptions.current].filter(([key]) => !allUrls.has(key));
        for (const [key, map] of subscriptionsToRemove) {
            map.subscription?.unsubscribe();
            subscriptions.current.delete(key);
            updateTotal();
        }

        for (const server of servers) {
            const {lastActiveAt, url} = server;
            if (lastActiveAt && (url !== serverUrl) && !subscriptions.current.has(url)) {
                const unreads: UnreadSubscription = {mentions: 0, unread: false};
                subscriptions.current.set(url, unreads);
                unreads.subscription = subscribeUnreadAndMentionsByServer(url, unreadsSubscription);
            } else if ((!lastActiveAt || (url === serverUrl)) && subscriptions.current.has(url)) {
                subscriptions.current.get(url)?.subscription?.unsubscribe();
                subscriptions.current.delete(url);
                updateTotal();
            }
        }
    };

    useDidMount(() => {
        const subscription = subscribeAllServers(serversObserver);

        return () => {
            subscription?.unsubscribe();
            subscriptions.current.forEach((unreads) => {
                unreads.subscription?.unsubscribe();
            });
            subscriptions.current.clear();
        };
    });

    const onReconnect = usePreventDoubleTap(useCallback(async () => {
        setIsReconnecting(true);
        setHasError(false);

        const result = await reconnectErasedServer(serverUrl);

        // On success or 401 the screen is replaced via setRoot/relaunch, so we
        // only need to surface state here when the call resolves with a generic error.
        if (result.error) {
            setHasError(true);
            setIsReconnecting(false);
        }
    }, [serverUrl]));

    const onPress = useCallback(() => {
        const servers = registeredServers.current;
        if (servers?.length) {
            const renderContent = () => {
                return (
                    <ServerList servers={servers}/>
                );
            };
            const maxScreenHeight = Math.ceil(0.6 * Dimensions.get('window').height);
            const maxSnapPoint = Math.min(
                maxScreenHeight,
                bottomSheetSnapPoint(servers.length, SERVER_ITEM_HEIGHT) + TITLE_HEIGHT + BUTTON_HEIGHT + insets.bottom +
                    (servers.filter((s: ServersModel) => s.lastActiveAt).length * PUSH_ALERT_TEXT_HEIGHT),
            );

            const snapPoints: Array<string | number> = [
                1,
                maxSnapPoint,
            ];
            if (maxSnapPoint === maxScreenHeight) {
                snapPoints.push('80%');
            }

            bottomSheet(renderContent, snapPoints, isTablet ? undefined : AddServerButton);
        }
    }, [insets.bottom, isTablet]);

    const buttonTestID = isReconnecting ? 'data_erased.reconnect.button.disabled' : 'data_erased.reconnect.button';

    return (
        <View style={[styles.container, {paddingBottom: insets.bottom}]}>
            <View style={styles.alertContainer}>
                <View style={styles.iconWrapper}>
                    <Alert/>
                </View>
                <FormattedText
                    id='mobile.ephemeralMode.dataErased.title'
                    defaultMessage='Cached data cleared'
                    style={styles.title}
                />
                <FormattedText
                    id='mobile.ephemeralMode.dataErased.body'
                    defaultMessage="Your organization's security policy cleared cached data for the server <b>{displayName}</b> after an extended time offline. Reconnect to restore your data."
                    values={{
                        b: (text: string) => <Text style={styles.boldText}>{text}</Text>,
                        displayName,
                    }}
                    style={styles.description}
                />
                <View style={styles.buttonContainer}>
                    <Button
                        onPress={onReconnect}
                        size='lg'
                        testID={buttonTestID}
                        text={intl.formatMessage({id: 'mobile.ephemeralMode.dataErased.action', defaultMessage: 'Reconnect'})}
                        showLoader={isReconnecting}
                        disabled={isReconnecting}
                        theme={theme}
                    />
                </View>
                {hasError && (
                    <FormattedText
                        id='mobile.ephemeralMode.dataErased.error'
                        defaultMessage="Couldn't reach the server. Check your connection and try again."
                        style={styles.error}
                    />
                )}
            </View>
            <ServerIcon
                hasUnreads={total.unread}
                mentionCount={total.mentions}
                onPress={onPress}
                style={[styles.icon, {top: insets.top + 10}]}
                testID='data_erased.servers.server_icon'
                iconColor={changeOpacity(theme.centerChannelColor, 0.56)}
                badgeBorderColor={theme.centerChannelBg}
                badgeBackgroundColor={theme.mentionBg}
                badgeColor={theme.mentionColor}
            />
        </View>
    );
};

export default DataErased;

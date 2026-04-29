// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {AppState, Dimensions, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {reconnectErasedServer} from '@actions/local/ephemeral_mode/reconnect';
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

interface Props {
    serverUrl: string;
    displayName: string;
}

const subscriptions: Map<string, UnreadSubscription> = new Map();

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

const DataErased = ({serverUrl, displayName}: Props) => {
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);
    const insets = useSafeAreaInsets();
    const registeredServers = useRef<ServersModel[]|undefined>();
    const isTablet = useIsTablet();
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [total, setTotal] = useState<UnreadMessages>({mentions: 0, unread: false});

    useEffect(() => {
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                setHasError(false);
            }
        });
        return () => sub.remove();
    }, []);

    const updateTotal = () => {
        let unread = false;
        let mentions = 0;
        subscriptions.forEach((value) => {
            unread = unread || value.unread;
            mentions += value.mentions;
        });
        setTotal({mentions, unread});
    };

    const unreadsSubscription = (url: string, {myChannels, settings, threadMentionCount, threadUnreads}: UnreadObserverArgs) => {
        const unreads = subscriptions.get(url);
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
            subscriptions.set(url, unreads);
            updateTotal();
        }
    };

    const serversObserver = (servers: ServersModel[]) => {
        registeredServers.current = sortServersByDisplayName(servers, intl);

        const allUrls = new Set(servers.map((s) => s.url));
        const subscriptionsToRemove = [...subscriptions].filter(([key]) => !allUrls.has(key));
        for (const [key, map] of subscriptionsToRemove) {
            map.subscription?.unsubscribe();
            subscriptions.delete(key);
            updateTotal();
        }

        for (const server of servers) {
            const {lastActiveAt, url} = server;
            if (lastActiveAt && (url !== serverUrl) && !subscriptions.has(url)) {
                const unreads: UnreadSubscription = {mentions: 0, unread: false};
                subscriptions.set(url, unreads);
                unreads.subscription = subscribeUnreadAndMentionsByServer(url, unreadsSubscription);
            } else if ((!lastActiveAt || (url === serverUrl)) && subscriptions.has(url)) {
                subscriptions.get(url)?.subscription?.unsubscribe();
                subscriptions.delete(url);
                updateTotal();
            }
        }
    };

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
        if (registeredServers.current?.length) {
            const renderContent = () => {
                return (
                    <ServerList servers={registeredServers.current!}/>
                );
            };
            const maxScreenHeight = Math.ceil(0.6 * Dimensions.get('window').height);
            const maxSnapPoint = Math.min(
                maxScreenHeight,
                bottomSheetSnapPoint(registeredServers.current.length, SERVER_ITEM_HEIGHT) + TITLE_HEIGHT + BUTTON_HEIGHT +
                    (registeredServers.current.filter((s: ServersModel) => s.lastActiveAt).length * PUSH_ALERT_TEXT_HEIGHT),
            );

            const snapPoints: Array<string | number> = [
                1,
                maxSnapPoint,
            ];
            if (maxSnapPoint === maxScreenHeight) {
                snapPoints.push('80%');
            }

            const closeButtonId = 'close-your-servers';
            bottomSheet({
                closeButtonId,
                renderContent,
                footerComponent: isTablet ? undefined : AddServerButton,
                snapPoints,
                theme,
                title: intl.formatMessage({id: 'your.servers', defaultMessage: 'Your servers'}),
            });
        }
    }, [intl, isTablet, theme]);

    const buttonTestID = isReconnecting ? 'data_erased.reconnect.button.disabled' : 'data_erased.reconnect.button';

    return (
        <View style={styles.container}>
            <View style={styles.alertContainer}>
                <View style={styles.iconWrapper}>
                    <Alert/>
                </View>
                <FormattedText
                    id='mobile.ephemeralMode.dataErased.title'
                    defaultMessage='Data has been erased'
                    style={styles.title}
                />
                <FormattedText
                    id='mobile.ephemeralMode.dataErased.body'
                    defaultMessage="Your organization's security policy removed cached data for {displayName} after a prolonged offline period. Reconnect to restore your data."
                    values={{displayName}}
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

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, Text, View} from 'react-native';
import {RectButton} from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import CompassIcon from '@components/compass_icon';
import ServerIcon from '@components/server_icon';
import {Events, Navigation} from '@constants';
import {useTheme} from '@context/theme';
import {subscribeServerUnreadAndMentions} from '@database/subscription/unreads';
import WebsocketManager from '@init/websocket_manager';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {removeProtocol, stripTrailingSlashes} from '@utils/url';

import Options from './options';

import type ServersModel from '@typings/database/models/app/servers';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type {Subscription} from 'rxjs';

type Props = {
    isActive: boolean;
    server: ServersModel;
}

type BadgeValues = {
    isUnread: boolean;
    mentions: number;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    active: {
        borderColor: theme.sidebarTextActiveBorder,
        borderWidth: 3,
    },
    badge: {
        left: 18,
        top: -5,
    },
    button: {
        borderRadius: 8,
        flex: 1,
        height: 72,
        justifyContent: 'center',
        paddingHorizontal: 18,
    },
    container: {
        alignItems: 'center',
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
        borderRadius: 8,
        flexDirection: 'row',
        height: 72,
        marginBottom: 12,
    },
    details: {
        marginLeft: 14,
    },
    logout: {
        backgroundColor: theme.centerChannelBg,
        borderRadius: 8,
        height: 16,
        left: 40,
        position: 'absolute',
        top: 11,
        width: 16,
    },
    nameContainer: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    name: {
        color: theme.centerChannelColor,
        ...typography('Body', 200, 'SemiBold'),
    },
    offline: {
        opacity: 0.5,
    },
    row: {flexDirection: 'row'},
    unread: {
        top: -2,
        left: 25,
    },
    url: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
        ...typography('Body', 75, 'Regular'),
    },
    websocket: {
        marginLeft: 7,
        marginTop: 4,
    },
}));

const ServerItem = ({isActive, server}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const [badge, setBadge] = useState<BadgeValues>({isUnread: false, mentions: 0});
    const styles = getStyleSheet(theme);
    const swipeable = useRef<Swipeable>();
    const subscription = useRef<Subscription|undefined>();
    const websocketError = server.lastActiveAt ? !WebsocketManager.isConnected(server.url) : false;
    let displayName = server.displayName;
    if (server.url === server.displayName) {
        displayName = intl.formatMessage({id: 'servers.default', defaultMessage: 'Default Server'});
    }

    const unreadsSubscription = (myChannels: MyChannelModel[]) => {
        let mentions = 0;
        let isUnread = false;
        for (const myChannel of myChannels) {
            mentions += myChannel.mentionsCount;
            isUnread = isUnread || myChannel.isUnread;
        }

        setBadge({isUnread, mentions});
    };

    const containerStyle = useMemo(() => {
        const style = [styles.container];
        if (isActive) {
            style.push(styles.active);
        }

        return style;
    }, [isActive]);

    const serverStyle = useMemo(() => {
        const style = [styles.row];
        if (!server.lastActiveAt) {
            style.push(styles.offline);
        }

        return style;
    }, [server.lastActiveAt]);

    const onServerPressed = useCallback(() => {
        if (isActive) {
            // eslint-disable-next-line no-console
            console.log('ACTIVE SERVER', server.displayName);
            DeviceEventEmitter.emit(Navigation.NAVIGATION_CLOSE_MODAL);
            return;
        }

        if (server.lastActiveAt) {
            // eslint-disable-next-line no-console
            console.log('SWITCH TO SERVER', server.displayName);
            return;
        }

        // eslint-disable-next-line no-console
        console.log('LOGIN TO SERVER', server.displayName);
    }, [server]);

    const onSwipeableWillOpen = useCallback(() => {
        DeviceEventEmitter.emit(Events.SWIPEABLE, server.url);
    }, [server]);

    const renderActions = useCallback((progress) => {
        return (
            <Options
                progress={progress}
                server={server}
            />
        );
    }, [server]);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.SWIPEABLE, (url: string) => {
            if (server.url !== url) {
                swipeable.current?.close();
            }
        });

        return () => listener.remove();
    }, [server]);

    useEffect(() => {
        if (!isActive) {
            if (server.lastActiveAt && !subscription.current) {
                subscription.current = subscribeServerUnreadAndMentions(server.url, unreadsSubscription);
            } else if (!server.lastActiveAt && subscription.current) {
                subscription.current.unsubscribe();
                subscription.current = undefined;
            }
        }

        return () => {
            subscription.current?.unsubscribe();
            subscription.current = undefined;
        };
    }, [server.lastActiveAt, isActive]);

    return (
        <Swipeable
            renderRightActions={renderActions}
            friction={2}
            onSwipeableWillOpen={onSwipeableWillOpen}

            // @ts-expect-error legacy ref
            ref={swipeable}
            rightThreshold={40}
        >
            <View
                style={containerStyle}
            >
                <RectButton
                    onPress={onServerPressed}
                    style={styles.button}
                    rippleColor={changeOpacity(theme.centerChannelColor, 0.16)}
                >
                    {!server.lastActiveAt &&
                    <View style={styles.logout}>
                        <CompassIcon
                            name='minus-circle'
                            size={16}
                            color={theme.dndIndicator}
                        />
                    </View>
                    }
                    <View style={serverStyle}>
                        <ServerIcon
                            badgeBackgroundColor={theme.mentionColor}
                            badgeBorderColor={theme.mentionBg}
                            badgeColor={theme.mentionBg}
                            badgeStyle={styles.badge}
                            iconColor={changeOpacity(theme.centerChannelColor, 0.56)}
                            hasUnreads={badge.isUnread}
                            mentionCount={badge.mentions}
                            size={36}
                            unreadStyle={styles.unread}
                        />
                        <View style={styles.details}>
                            <View style={styles.nameContainer}>
                                <Text style={styles.name}>{displayName}</Text>
                                {websocketError &&
                                <CompassIcon
                                    name='alert-circle-outline'
                                    size={14.4}
                                    color={theme.dndIndicator}
                                    style={styles.websocket}
                                />
                                }
                            </View>
                            <Text style={styles.url}>{removeProtocol(stripTrailingSlashes(server.url))}</Text>
                        </View>
                    </View>
                </RectButton>
            </View>
        </Swipeable>
    );
};

export default ServerItem;

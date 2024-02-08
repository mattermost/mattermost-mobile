// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Animated, DeviceEventEmitter, InteractionManager, Platform, type StyleProp, Text, View, type ViewStyle} from 'react-native';
import {RectButton} from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import {Navigation} from 'react-native-navigation';

import {storeMultiServerTutorial} from '@actions/app/global';
import {doPing} from '@actions/remote/general';
import {logout} from '@actions/remote/session';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
import ServerIcon from '@components/server_icon';
import TutorialHighlight from '@components/tutorial_highlight';
import TutorialSwipeLeft from '@components/tutorial_highlight/swipe_left';
import {Events, Screens} from '@constants';
import {PUSH_PROXY_STATUS_NOT_AVAILABLE, PUSH_PROXY_STATUS_VERIFIED} from '@constants/push_proxy';
import {useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import {subscribeServerUnreadAndMentions, type UnreadObserverArgs} from '@database/subscription/unreads';
import {useIsTablet} from '@hooks/device';
import WebsocketManager from '@managers/websocket_manager';
import {getServerByIdentifier} from '@queries/app/servers';
import {dismissBottomSheet} from '@screens/navigation';
import {canReceiveNotifications} from '@utils/push_proxy';
import {alertServerAlreadyConnected, alertServerError, alertServerLogout, alertServerRemove, editServer, loginToServer} from '@utils/server';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {removeProtocol, stripTrailingSlashes} from '@utils/url';

import Options from './options';
import WebSocket from './websocket';

import type ServersModel from '@typings/database/models/app/servers';
import type {Subscription} from 'rxjs';

type Props = {
    highlight: boolean;
    isActive: boolean;
    server: ServersModel;
    tutorialWatched: boolean;
    pushProxyStatus: string;
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
        borderColor: theme.centerChannelBg,
    },
    button: {
        borderRadius: 8,
        flex: 1,
        height: 72,
        justifyContent: 'center',
        paddingLeft: 18,
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
        flex: 1,
    },
    logout: {
        backgroundColor: theme.centerChannelBg,
        borderRadius: 8,
        height: 18,
        left: 42,
        position: 'absolute',
        top: 11,
        width: 18,
    },
    name: {
        color: theme.centerChannelColor,
        ...typography('Body', 200, 'SemiBold'),
        flex: 1,
    },
    offline: {
        opacity: 0.5,
    },
    row: {flexDirection: 'row', alignItems: 'center'},
    serverIcon: {
        borderColor: 'transparent',
        borderWidth: 1,
        height: 72,
        justifyContent: 'center',
        width: 50,
    },
    unread: {
        top: -2,
        left: 25,
    },
    url: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
        ...typography('Body', 75, 'Regular'),
        marginRight: 7,
    },
    switching: {
        height: 40,
        width: 40,
        justifyContent: 'center',
        marginRight: 5,
    },
    tutorial: {
        top: -30,
    },
    tutorialTablet: {
        top: -80,
    },
    nameView: {
        flexDirection: 'row',
        marginRight: 7,
    },
    pushAlert: {
        marginLeft: 7,
        alignSelf: 'center',
    },
    pushAlertText: {
        color: theme.errorTextColor,
        ...typography('Body', 75, 'Regular'),
        marginBottom: 12,
    },
}));

const ServerItem = ({
    highlight,
    isActive,
    server,
    tutorialWatched,
    pushProxyStatus,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const [switching, setSwitching] = useState(false);
    const [badge, setBadge] = useState<BadgeValues>({isUnread: false, mentions: 0});
    const styles = getStyleSheet(theme);
    const swipeable = useRef<Swipeable>(null);
    const subscription = useRef<Subscription|undefined>();
    const viewRef = useRef<View>(null);
    const [showTutorial, setShowTutorial] = useState(false);
    const [itemBounds, setItemBounds] = useState<TutorialItemBounds>({startX: 0, startY: 0, endX: 0, endY: 0});
    const tutorialShown = useRef(false);

    let displayName = server.displayName;

    if (server.url === server.displayName) {
        displayName = intl.formatMessage({id: 'servers.default', defaultMessage: 'Default Server'});
    }

    const unreadsSubscription = ({myChannels, settings, threadMentionCount, threadUnreads}: UnreadObserverArgs) => {
        let mentions = 0;
        let isUnread = Boolean(threadUnreads);
        for (const myChannel of myChannels) {
            const isMuted = settings?.[myChannel.id]?.mark_unread === 'mention';
            mentions += isMuted ? 0 : myChannel.mentionsCount;
            isUnread = isUnread || (myChannel.isUnread && !isMuted);
        }
        mentions += threadMentionCount;

        setBadge({isUnread, mentions});
    };

    const logoutServer = async () => {
        Navigation.updateProps(Screens.HOME, {extra: undefined});
        await logout(server.url);

        if (isActive) {
            dismissBottomSheet();
        } else {
            DeviceEventEmitter.emit(Events.SWIPEABLE, '');
        }
    };

    const removeServer = async () => {
        const skipLogoutFromServer = server.lastActiveAt === 0;
        await dismissBottomSheet();
        Navigation.updateProps(Screens.HOME, {extra: undefined});
        await logout(server.url, skipLogoutFromServer, true);
    };

    const startTutorial = () => {
        viewRef.current?.measureInWindow((x, y, w, h) => {
            const bounds: TutorialItemBounds = {
                startX: x,
                startY: y,
                endX: x + w,
                endY: y + h,
            };

            if (viewRef.current) {
                setItemBounds(bounds);
            }
        });
    };

    const onLayout = useCallback(() => {
        if (highlight && !tutorialWatched) {
            if (isTablet) {
                setShowTutorial(true);
                return;
            }
            InteractionManager.runAfterInteractions(() => {
                setShowTutorial(true);
            });
        }
    }, [showTutorial]);

    useLayoutEffect(() => {
        if (showTutorial && !tutorialShown.current) {
            swipeable.current?.close();
            tutorialShown.current = true;
            startTutorial();
        }
    });

    const containerStyle = useMemo(() => {
        const style: StyleProp<ViewStyle> = [styles.container];
        if (isActive) {
            style.push(styles.active);
        }

        return style;
    }, [isActive]);

    const serverStyle = useMemo(() => {
        const style: StyleProp<ViewStyle> = [styles.row];
        if (!server.lastActiveAt) {
            style.push(styles.offline);
        }

        return style;
    }, [server.lastActiveAt]);

    const handleLogin = useCallback(async () => {
        swipeable.current?.close();
        setSwitching(true);
        const result = await doPing(server.url, true);
        if (result.error) {
            alertServerError(intl, result.error);
            setSwitching(false);
            return;
        }

        const data = await fetchConfigAndLicense(server.url, true);
        if (data.error) {
            alertServerError(intl, data.error);
            setSwitching(false);
            return;
        }
        const existingServer = await getServerByIdentifier(data.config!.DiagnosticId);
        if (existingServer && existingServer.lastActiveAt > 0) {
            alertServerAlreadyConnected(intl);
            setSwitching(false);
            return;
        }

        canReceiveNotifications(server.url, result.canReceiveNotifications as string, intl);
        loginToServer(theme, server.url, displayName, data.config!, data.license!);
    }, [server, theme, intl]);

    const handleDismissTutorial = useCallback(() => {
        swipeable.current?.close();
        setShowTutorial(false);
        storeMultiServerTutorial();
    }, []);

    const handleEdit = useCallback(() => {
        DeviceEventEmitter.emit(Events.SWIPEABLE, '');
        editServer(theme, server);
    }, [server]);

    const handleLogout = useCallback(async () => {
        alertServerLogout(server.displayName, logoutServer, intl);
    }, [isActive, intl, server]);

    const handleRemove = useCallback(() => {
        alertServerRemove(server.displayName, removeServer, intl);
    }, [isActive, server, intl]);

    const handleShowTutorial = useCallback(() => {
        swipeable.current?.openRight();
    }, []);

    const onServerPressed = useCallback(async () => {
        if (isActive) {
            dismissBottomSheet();
            return;
        }

        if (server.lastActiveAt) {
            setSwitching(true);
            await dismissBottomSheet();
            Navigation.updateProps(Screens.HOME, {extra: undefined});
            DatabaseManager.setActiveServerDatabase(server.url);
            WebsocketManager.initializeClient(server.url);
            return;
        }

        handleLogin();
    }, [server, isActive, theme, intl]);

    const onSwipeableWillOpen = useCallback(() => {
        DeviceEventEmitter.emit(Events.SWIPEABLE, server.url);
    }, [server]);

    const renderActions = useCallback((progress: Animated.AnimatedInterpolation<number>) => {
        return (
            <Options
                onEdit={handleEdit}
                onLogin={handleLogin}
                onLogout={handleLogout}
                onRemove={handleRemove}
                progress={progress}
                server={server}
            />
        );
    }, [isActive, server, theme, intl]);

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
            } else if (!server.lastActiveAt) {
                subscription.current?.unsubscribe();
                subscription.current = undefined;
                setBadge({isUnread: false, mentions: 0});
            }
        }

        return () => {
            subscription.current?.unsubscribe();
            subscription.current = undefined;
        };
    }, [server.lastActiveAt, isActive]);

    const serverItem = `server_list.server_item.${server.displayName.replace(/ /g, '_').toLocaleLowerCase()}`;
    const serverItemTestId = isActive ? `${serverItem}.active` : `${serverItem}.inactive`;

    let pushAlertText;
    if (server.lastActiveAt) {
        if (pushProxyStatus === PUSH_PROXY_STATUS_NOT_AVAILABLE) {
            pushAlertText = intl.formatMessage({
                id: 'server_list.push_proxy_error',
                defaultMessage: 'Notifications cannot be received from this server because of its configuration. Contact your system admin.',
            });
        } else {
            pushAlertText = intl.formatMessage({
                id: 'server_list.push_proxy_unknown',
                defaultMessage: 'Notifications could not be received from this server because of its configuration. Log out and Log in again to retry.',
            });
        }
    }

    return (
        <>
            <Swipeable
                renderRightActions={renderActions}
                friction={2}
                onSwipeableWillOpen={onSwipeableWillOpen}
                ref={swipeable}
                rightThreshold={40}
            >
                <View
                    style={containerStyle}
                    ref={viewRef}
                    testID={serverItemTestId}
                    onLayout={onLayout}
                >
                    <RectButton
                        onPress={onServerPressed}
                        style={styles.button}
                        rippleColor={changeOpacity(theme.centerChannelColor, 0.16)}
                    >
                        <View style={serverStyle}>
                            {!switching &&
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
                                style={styles.serverIcon}
                                testID={`${serverItem}}.server_icon`}
                            />
                            }
                            {switching &&
                            <Loading
                                containerStyle={styles.switching}
                                color={theme.buttonBg}
                                size={Platform.select({ios: 'small', default: 'large'})}
                            />
                            }
                            <View style={styles.details}>
                                <View style={styles.nameView}>
                                    <Text
                                        numberOfLines={1}
                                        ellipsizeMode='tail'
                                        style={styles.name}
                                    >
                                        {displayName}
                                    </Text>
                                    {server.lastActiveAt > 0 && pushProxyStatus !== PUSH_PROXY_STATUS_VERIFIED && (
                                        <CompassIcon
                                            name='alert-outline'
                                            color={theme.errorTextColor}
                                            size={14}
                                            style={styles.pushAlert}
                                        />
                                    )}
                                </View>
                                <Text
                                    numberOfLines={1}
                                    ellipsizeMode='tail'
                                    style={styles.url}
                                >
                                    {removeProtocol(stripTrailingSlashes(server.url))}
                                </Text>
                            </View>
                        </View>
                        {!server.lastActiveAt && !switching &&
                        <View style={styles.logout}>
                            <CompassIcon
                                name='alert-circle-outline'
                                size={18}
                                color={changeOpacity(theme.centerChannelColor, 0.64)}
                            />
                        </View>
                        }
                    </RectButton>
                </View>
            </Swipeable>
            {Boolean(pushAlertText && pushProxyStatus !== PUSH_PROXY_STATUS_VERIFIED) && (
                <Text style={styles.pushAlertText}>
                    {pushAlertText}
                </Text>
            )}

            {server.lastActiveAt > 0 &&
            <WebSocket
                serverUrl={server.url}
            />
            }
            {showTutorial &&
            <TutorialHighlight
                itemBounds={itemBounds}
                onDismiss={handleDismissTutorial}
                onShow={handleShowTutorial}
                itemBorderRadius={8}
            >
                {Boolean(itemBounds.endX) &&
                <TutorialSwipeLeft
                    message={intl.formatMessage({id: 'server.tutorial.swipe', defaultMessage: 'Swipe left on a server to see more actions'})}
                    style={isTablet ? styles.tutorialTablet : styles.tutorial}
                />
                }
            </TutorialHighlight>
            }
        </>
    );
};

export default ServerItem;

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, Text, View} from 'react-native';
import {RectButton} from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import {storeMultiServerTutorial} from '@actions/app/global';
import {appEntry} from '@actions/remote/entry';
import {logout} from '@actions/remote/session';
import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
import ServerIcon from '@components/server_icon';
import TutorialHighlight from '@components/tutorial_highlight';
import TutorialSwipeLeft from '@components/tutorial_highlight/swipe_left';
import {Events} from '@constants';
import {useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import {subscribeServerUnreadAndMentions} from '@database/subscription/unreads';
import {useIsTablet} from '@hooks/device';
import {dismissBottomSheet} from '@screens/navigation';
import {addNewServer, alertServerLogout, alertServerRemove, editServer} from '@utils/server';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {removeProtocol, stripTrailingSlashes} from '@utils/url';

import Options from './options';
import WebSocket from './websocket';

import type ServersModel from '@typings/database/models/app/servers';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type {Subscription} from 'rxjs';

type Props = {
    highlight: boolean;
    isActive: boolean;
    server: ServersModel;
    tutorialWatched: boolean;
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
        height: 18,
        left: 42,
        position: 'absolute',
        top: 11,
        width: 18,
    },
    name: {
        color: theme.centerChannelColor,
        ...typography('Body', 200, 'SemiBold'),
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
        width: 45,
    },
    unread: {
        top: -2,
        left: 25,
    },
    url: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
        ...typography('Body', 75, 'Regular'),
    },
    switching: {
        height: 40,
        width: 40,
        justifyContent: 'center',
    },
    tutorial: {
        top: -30,
    },
    tutorialTablet: {
        top: -80,
    },
}));

const ServerItem = ({highlight, isActive, server, tutorialWatched}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const [switching, setSwitching] = useState(false);
    const [badge, setBadge] = useState<BadgeValues>({isUnread: false, mentions: 0});
    const styles = getStyleSheet(theme);
    const swipeable = useRef<Swipeable>();
    const subscription = useRef<Subscription|undefined>();
    const viewRef = useRef<View>(null);
    const [showTutorial, setShowTutorial] = useState(false);
    const [itemBounds, setItemBounds] = useState<TutorialItemBounds>({startX: 0, startY: 0, endX: 0, endY: 0});
    const database = DatabaseManager.serverDatabases[server.url]?.database;
    let displayName = server.displayName;

    if (server.url === server.displayName) {
        displayName = intl.formatMessage({id: 'servers.default', defaultMessage: 'Default Server'});
    }

    const unreadsSubscription = ({myChannels, threadMentionCount}: {myChannels: MyChannelModel[]; threadMentionCount: number}) => {
        let mentions = 0;
        let isUnread = false;
        for (const myChannel of myChannels) {
            mentions += myChannel.mentionsCount;
            isUnread = isUnread || myChannel.isUnread;
        }
        mentions += threadMentionCount;

        setBadge({isUnread, mentions});
    };

    const logoutServer = async () => {
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
        await logout(server.url, skipLogoutFromServer, true);
    };

    const startTutorial = () => {
        viewRef.current?.measureInWindow((x, y, w, h) => {
            const bounds: TutorialItemBounds = {
                startX: x - 20,
                startY: y - 5,
                endX: x + w + 20,
                endY: y + h + 5,
            };
            setShowTutorial(true);
            setItemBounds(bounds);
        });
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

    const handleLogin = useCallback(() => {
        addNewServer(theme, server.url, displayName);
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
            await appEntry(server.url, Date.now());
            await dismissBottomSheet();
            DatabaseManager.setActiveServerDatabase(server.url);
            return;
        }

        handleLogin();
    }, [server, isActive, theme, intl]);

    const onSwipeableWillOpen = useCallback(() => {
        DeviceEventEmitter.emit(Events.SWIPEABLE, server.url);
    }, [server]);

    const renderActions = useCallback((progress) => {
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

    useEffect(() => {
        let time: NodeJS.Timeout;
        if (highlight && !tutorialWatched) {
            time = setTimeout(startTutorial, 300);
        }
        return () => clearTimeout(time);
    }, [highlight, tutorialWatched]);

    const serverItem = `server_list.server_item.${server.displayName.replace(/ /g, '_').toLocaleLowerCase()}`;
    const serverItemTestId = isActive ? `${serverItem}.active` : `${serverItem}.inactive`;

    return (
        <>
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
                    ref={viewRef}
                    testID={serverItemTestId}
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
                                style={styles.swithing}
                                color={theme.buttonBg}
                            />
                            }
                            <View style={styles.details}>
                                <Text style={styles.name}>{displayName}</Text>
                                <Text style={styles.url}>{removeProtocol(stripTrailingSlashes(server.url))}</Text>
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
            {Boolean(database) && server.lastActiveAt > 0 &&
            <WebSocket
                database={database}
            />
            }
            {showTutorial &&
            <TutorialHighlight
                itemBounds={itemBounds}
                onDismiss={handleDismissTutorial}
                onShow={handleShowTutorial}
            >
                <TutorialSwipeLeft
                    message={intl.formatMessage({id: 'server.tutorial.swipe', defaultMessage: 'Swipe left on a server to see more actions'})}
                    style={isTablet ? styles.tutorialTablet : styles.tutorial}
                />
            </TutorialHighlight>
            }
        </>
    );
};

export default ServerItem;

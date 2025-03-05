// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useHardwareKeyboardEvents} from '@mattermost/hardware-keyboard';
import {createBottomTabNavigator, type BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import React, {useCallback, useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, Platform, StyleSheet, View} from 'react-native';
import {enableFreeze, enableScreens} from 'react-native-screens';

import {initializeSecurityManager} from '@actions/app/server';
import {autoUpdateTimezone} from '@actions/remote/user';
import ServerVersion from '@components/server_version';
import {Events, Launch, Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useAppState} from '@hooks/device';
import SecurityManager from '@managers/security_manager';
import {getAllServers} from '@queries/app/servers';
import {findChannels, popToRoot} from '@screens/navigation';
import NavigationStore from '@store/navigation_store';
import {alertInvalidDeepLink, handleDeepLink} from '@utils/deep_link';
import {logError} from '@utils/log';
import {alertChannelArchived, alertChannelRemove, alertTeamRemove} from '@utils/navigation';
import {notificationError} from '@utils/notification';

import Account from './account';
import ChannelList from './channel_list';
import RecentMentions from './recent_mentions';
import SavedMessages from './saved_messages';
import Search from './search';
import TabBar from './tab_bar';

import type {DeepLinkWithData, LaunchProps} from '@typings/launch';

if (Platform.OS === 'ios') {
    // We do this on iOS to avoid conflicts betwen ReactNavigation & Wix ReactNativeNavigation
    enableScreens(false);
}

enableFreeze(true);

type HomeProps = LaunchProps & {
    componentId: string;
};

const Tab = createBottomTabNavigator();

const updateTimezoneIfNeeded = async () => {
    try {
        const servers = await getAllServers();
        for (const server of servers) {
            if (server.url && server.lastActiveAt > 0) {
                autoUpdateTimezone(server.url);
            }
        }
    } catch (e) {
        logError('Localize change', e);
    }
};

const styles = StyleSheet.create({
    flex: {flex: 1},
});

export function HomeScreen(props: HomeProps) {
    const theme = useTheme();
    const intl = useIntl();
    const appState = useAppState();

    useEffect(() => {
        initializeSecurityManager();
    }, []);

    const handleFindChannels = useCallback(() => {
        if (!NavigationStore.getScreensInStack().includes(Screens.FIND_CHANNELS)) {
            findChannels(
                intl.formatMessage({id: 'find_channels.title', defaultMessage: 'Find Channels'}),
                theme,
            );
        }
    }, [intl, theme]);

    const events = useMemo(() => ({onFindChannels: handleFindChannels}), [handleFindChannels]);
    useHardwareKeyboardEvents(events);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.NOTIFICATION_ERROR, (value: 'Team' | 'Channel' | 'Post' | 'Connection') => {
            notificationError(intl, value);
        });

        return () => {
            listener.remove();
        };
    }, [intl]);

    useEffect(() => {
        const leaveTeamListener = DeviceEventEmitter.addListener(Events.LEAVE_TEAM, (displayName: string) => {
            alertTeamRemove(displayName, intl);
        });

        const leaveChannelListener = DeviceEventEmitter.addListener(Events.LEAVE_CHANNEL, (displayName: string) => {
            alertChannelRemove(displayName, intl);
        });

        const archivedChannelListener = DeviceEventEmitter.addListener(Events.CHANNEL_ARCHIVED, (displayName: string) => {
            alertChannelArchived(displayName, intl);
        });

        const crtToggledListener = DeviceEventEmitter.addListener(Events.CRT_TOGGLED, (isSameServer: boolean) => {
            if (isSameServer) {
                popToRoot();
            }
        });

        return () => {
            leaveTeamListener.remove();
            leaveChannelListener.remove();
            archivedChannelListener.remove();
            crtToggledListener.remove();
        };
    }, [intl]);

    useEffect(() => {
        if (appState === 'active') {
            updateTimezoneIfNeeded();
        }
    }, [appState]);

    useEffect(() => {
        if (props.launchType === Launch.DeepLink) {
            if (props.launchError) {
                alertInvalidDeepLink(intl);
                return;
            }

            const deepLink = props.extra as DeepLinkWithData;
            if (deepLink?.url) {
                handleDeepLink(deepLink.url, intl, props.componentId, true).then((result) => {
                    if (result.error) {
                        alertInvalidDeepLink(intl);
                    }
                });
            }
        }
    }, []);

    return (
        <View
            style={styles.flex}
            nativeID={SecurityManager.getShieldScreenId(Screens.HOME, true)}
        >
            <NavigationContainer
                theme={{
                    ...DefaultTheme,
                    dark: false,
                    colors: {
                        ...DefaultTheme.colors,
                        primary: theme.centerChannelColor,
                        background: 'transparent',
                        card: theme.centerChannelBg,
                        text: theme.centerChannelColor,
                        border: 'white',
                        notification: theme.mentionHighlightBg,
                    },
                }}
            >
                <Tab.Navigator
                    screenOptions={{headerShown: false, freezeOnBlur: false, lazy: true}}
                    backBehavior='none'
                    tabBar={(tabProps: BottomTabBarProps) => (
                        <TabBar
                            {...tabProps}
                            theme={theme}
                        />)}
                >
                    <Tab.Screen
                        name={Screens.HOME}
                        options={{tabBarButtonTestID: 'tab_bar.home.tab', freezeOnBlur: true}}
                    >
                        {() => <ChannelList {...props}/>}
                    </Tab.Screen>
                    <Tab.Screen
                        name={Screens.SEARCH}
                        component={Search}
                        options={{tabBarButtonTestID: 'tab_bar.search.tab', freezeOnBlur: true, lazy: true}}
                    />
                    <Tab.Screen
                        name={Screens.MENTIONS}
                        component={RecentMentions}
                        options={{tabBarButtonTestID: 'tab_bar.mentions.tab', freezeOnBlur: true, lazy: true}}
                    />
                    <Tab.Screen
                        name={Screens.SAVED_MESSAGES}
                        component={SavedMessages}
                        options={{tabBarButtonTestID: 'tab_bar.saved_messages.tab', freezeOnBlur: true, lazy: true}}
                    />
                    <Tab.Screen
                        name={Screens.ACCOUNT}
                        component={Account}
                        options={{tabBarButtonTestID: 'tab_bar.account.tab', freezeOnBlur: true, lazy: true}}
                    />
                </Tab.Navigator>
            </NavigationContainer>
            <ServerVersion/>
        </View>
    );
}

export default HomeScreen;

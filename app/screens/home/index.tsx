// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createBottomTabNavigator, BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {NavigationContainer} from '@react-navigation/native';
import React, {useEffect} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, Platform} from 'react-native';
import HWKeyboardEvent from 'react-native-hw-keyboard-event';
import {enableFreeze, enableScreens} from 'react-native-screens';

import ServerVersion from '@components/server_version';
import {Events, Screens} from '@constants';
import {useTheme} from '@context/theme';
import {findChannels, popToRoot} from '@screens/navigation';
import NavigationStore from '@store/navigation_store';
import {handleDeepLink} from '@utils/deep_link';
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

export default function HomeScreen(props: HomeProps) {
    const theme = useTheme();
    const intl = useIntl();

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.NOTIFICATION_ERROR, (value: 'Team' | 'Channel' | 'Post' | 'Connection') => {
            notificationError(intl, value);
        });

        return () => {
            listener.remove();
        };
    }, [intl.locale]);

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
    }, [intl.locale]);

    useEffect(() => {
        const listener = HWKeyboardEvent.onHWKeyPressed((keyEvent: {pressedKey: string}) => {
            if (!NavigationStore.getScreensInStack().includes(Screens.FIND_CHANNELS) && keyEvent.pressedKey === 'find-channels') {
                findChannels(
                    intl.formatMessage({id: 'find_channels.title', defaultMessage: 'Find Channels'}),
                    theme,
                );
            }
        });
        return () => {
            listener.remove();
        };
    }, [intl.locale]);

    useEffect(() => {
        if (props.launchType === 'deeplink') {
            const deepLink = props.extra as DeepLinkWithData;
            if (deepLink?.url) {
                handleDeepLink(deepLink.url);
            }
        }
    }, []);

    return (
        <>
            <NavigationContainer
                theme={{
                    dark: false,
                    colors: {
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
                    screenOptions={{headerShown: false, unmountOnBlur: false, lazy: true}}
                    backBehavior='none'
                    tabBar={(tabProps: BottomTabBarProps) => (
                        <TabBar
                            {...tabProps}
                            theme={theme}
                        />)}
                >
                    <Tab.Screen
                        name={Screens.HOME}
                        options={{tabBarTestID: 'tab_bar.home.tab', unmountOnBlur: false, freezeOnBlur: true}}
                    >
                        {() => <ChannelList {...props}/>}
                    </Tab.Screen>
                    <Tab.Screen
                        name={Screens.SEARCH}
                        component={Search}
                        options={{tabBarTestID: 'tab_bar.search.tab', unmountOnBlur: false, freezeOnBlur: true, lazy: true}}
                    />
                    <Tab.Screen
                        name={Screens.MENTIONS}
                        component={RecentMentions}
                        options={{tabBarTestID: 'tab_bar.mentions.tab', freezeOnBlur: true, lazy: true}}
                    />
                    <Tab.Screen
                        name={Screens.SAVED_MESSAGES}
                        component={SavedMessages}
                        options={{tabBarTestID: 'tab_bar.saved_messages.tab', freezeOnBlur: true, lazy: true}}
                    />
                    <Tab.Screen
                        name={Screens.ACCOUNT}
                        component={Account}
                        options={{tabBarTestID: 'tab_bar.account.tab', freezeOnBlur: true, lazy: true}}
                    />
                </Tab.Navigator>
            </NavigationContainer>
            <ServerVersion/>
        </>
    );
}

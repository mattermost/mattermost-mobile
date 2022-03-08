// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createBottomTabNavigator, BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {NavigationContainer} from '@react-navigation/native';
import React, {useEffect} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, Platform} from 'react-native';
import {enableFreeze, enableScreens} from 'react-native-screens';

import {Events, Screens} from '@constants';
import {useTheme} from '@context/theme';
import {notificationError} from '@utils/notification';

import Account from './account';
import ChannelList from './channel_list';
import RecentMentions from './recent_mentions';
import Search from './search';
import TabBar from './tab_bar';

import type {LaunchProps} from '@typings/launch';

if (Platform.OS === 'ios') {
    // We do this on iOS to avoid conflicts betwen ReactNavigation & Wix ReactNativeNavigation
    enableScreens(false);
}

enableFreeze(true);

type HomeProps = LaunchProps & {
    time?: number;
};

const Tab = createBottomTabNavigator();

export default function HomeScreen(props: HomeProps) {
    const theme = useTheme();
    const intl = useIntl();

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.NOTIFICATION_ERROR, (value: 'Team' | 'Channel') => {
            notificationError(intl, value);
        });

        return () => {
            listener.remove();
        };
    }, []);

    return (
        <NavigationContainer
            theme={{
                dark: false,
                colors: {
                    primary: theme.centerChannelColor,
                    background: theme.centerChannelBg,
                    card: theme.centerChannelBg,
                    text: theme.centerChannelColor,
                    border: 'white',
                    notification: theme.mentionHighlightBg,
                },
            }}
        >
            <Tab.Navigator
                screenOptions={{headerShown: false, lazy: true, unmountOnBlur: true}}
                tabBar={(tabProps: BottomTabBarProps) => (
                    <TabBar
                        {...tabProps}
                        theme={theme}
                    />)}
            >
                <Tab.Screen
                    name={Screens.HOME}
                    options={{title: 'Channel', unmountOnBlur: false}}
                >
                    {() => <ChannelList {...props}/>}
                </Tab.Screen>
                <Tab.Screen
                    name={Screens.SEARCH}
                    component={Search}
                    options={{unmountOnBlur: false}}
                />
                <Tab.Screen
                    name={Screens.MENTIONS}
                    component={RecentMentions}
                />
                <Tab.Screen
                    name={Screens.ACCOUNT}
                    component={Account}
                />
            </Tab.Navigator>
        </NavigationContainer>
    );
}

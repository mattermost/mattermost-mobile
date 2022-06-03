// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createBottomTabNavigator, BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {NavigationContainer} from '@react-navigation/native';
import React, {useEffect} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, Platform} from 'react-native';
import HWKeyboardEvent from 'react-native-hw-keyboard-event';
import {enableFreeze, enableScreens} from 'react-native-screens';

import {Events, Screens} from '@constants';
import {useTheme} from '@context/theme';
import {findChannels} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {alertChannelArchived, alertChannelRemove, alertTeamRemove} from '@utils/navigation';
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
    componentId: string;
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

        return () => {
            leaveTeamListener.remove();
            leaveChannelListener.remove();
            archivedChannelListener.remove();
        };
    }, [intl.locale]);

    useEffect(() => {
        const listener = HWKeyboardEvent.onHWKeyPressed((keyEvent: {pressedKey: string}) => {
            const screen = EphemeralStore.getAllNavigationComponents();
            if (!screen.includes(Screens.FIND_CHANNELS) && keyEvent.pressedKey === 'find-channels') {
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

    return (
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
                screenOptions={{headerShown: false, lazy: true, unmountOnBlur: false}}
                backBehavior='none'
                tabBar={(tabProps: BottomTabBarProps) => (
                    <TabBar
                        {...tabProps}
                        theme={theme}
                    />)}
            >
                <Tab.Screen
                    name={Screens.HOME}
                    options={{title: 'Channel', unmountOnBlur: false, tabBarTestID: 'tab_bar.home.tab'}}
                >
                    {() => <ChannelList {...props}/>}
                </Tab.Screen>
                <Tab.Screen
                    name={Screens.SEARCH}
                    component={Search}
                    options={{unmountOnBlur: false, lazy: true, tabBarTestID: 'tab_bar.search.tab'}}
                />
                <Tab.Screen
                    name={Screens.MENTIONS}
                    component={RecentMentions}
                    options={{tabBarTestID: 'tab_bar.mentions.tab', lazy: true, unmountOnBlur: false}}
                />
                <Tab.Screen
                    name={Screens.ACCOUNT}
                    component={Account}
                    options={{tabBarTestID: 'tab_bar.account.tab', lazy: true, unmountOnBlur: false}}
                />
            </Tab.Navigator>
        </NavigationContainer>
    );
}

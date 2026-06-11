// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Tabs} from 'expo-router';
import React from 'react';

import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import TabBar from '@screens/home/tab_bar';
import {makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    card: {
        backgroundColor: theme.centerChannelBg,
    },
}));

export default function TabLayout() {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                lazy: true,
                sceneStyle: styles.card,
            }}
            backBehavior='none'
            tabBar={(props) => (
                <TabBar
                    {...props}
                    theme={theme}
                />
            )}
        >
            <Tabs.Screen
                name={Screens.CHANNEL_LIST}
                options={{
                    title: 'Home',
                    href: '/(authenticated)/(home)',
                    tabBarButtonTestID: 'tab_bar.home.tab',
                    freezeOnBlur: false,
                    animation: 'none',
                }}
            />
            <Tabs.Screen
                name={Screens.SEARCH}
                options={{
                    title: 'Search',
                    href: null,
                    tabBarButtonTestID: 'tab_bar.search.tab',
                    freezeOnBlur: true,
                }}
            />
            <Tabs.Screen
                name={Screens.MENTIONS}
                options={{
                    title: 'Mentions',
                    href: null,
                    tabBarButtonTestID: 'tab_bar.mentions.tab',
                    freezeOnBlur: true,
                }}
            />
            <Tabs.Screen
                name={Screens.SAVED_MESSAGES}
                options={{
                    title: 'Saved',
                    href: null,
                    tabBarButtonTestID: 'tab_bar.saved_messages.tab',
                    freezeOnBlur: true,
                }}
            />
            <Tabs.Screen
                name={Screens.ACCOUNT}
                options={{
                    title: 'Account',
                    href: null,
                    tabBarButtonTestID: 'tab_bar.account.tab',
                    freezeOnBlur: true,
                }}
            />
        </Tabs>
    );
}

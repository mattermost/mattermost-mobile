// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Tabs} from 'expo-router';
import React from 'react';
import {useIntl} from 'react-intl';

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
    const {formatMessage} = useIntl();
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
                    title: formatMessage({id: 'mobile.navigation.home', defaultMessage: 'Home'}),
                    href: '/(authenticated)/(home)',
                    tabBarButtonTestID: 'tab_bar.home.tab',
                    freezeOnBlur: false,
                    animation: 'none',
                }}
            />
            <Tabs.Screen
                name={Screens.SEARCH}
                options={{
                    title: formatMessage({id: 'mobile.navigation.search', defaultMessage: 'Search'}),
                    href: null,
                    tabBarButtonTestID: 'tab_bar.search.tab',
                    freezeOnBlur: true,
                }}
            />
            <Tabs.Screen
                name={Screens.MENTIONS}
                options={{
                    title: formatMessage({id: 'mobile.navigation.mentions', defaultMessage: 'Mentions'}),
                    href: null,
                    tabBarButtonTestID: 'tab_bar.mentions.tab',
                    freezeOnBlur: true,
                }}
            />
            <Tabs.Screen
                name={Screens.SAVED_MESSAGES}
                options={{
                    title: formatMessage({id: 'mobile.navigation.saved', defaultMessage: 'Saved'}),
                    href: null,
                    tabBarButtonTestID: 'tab_bar.saved_messages.tab',
                    freezeOnBlur: true,
                }}
            />
            <Tabs.Screen
                name={Screens.ACCOUNT}
                options={{
                    title: formatMessage({id: 'mobile.navigation.account', defaultMessage: 'Account'}),
                    href: null,
                    tabBarButtonTestID: 'tab_bar.account.tab',
                    freezeOnBlur: true,
                }}
            />
        </Tabs>
    );
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';

import {Preferences} from '@mm-redux/constants';

import ExtensionChannels from './extension_channels';
import ExtensionPost from './extension_post';
import ExtensionTeams from './extension_teams';

const theme = Preferences.THEMES.default;
const Stack = createStackNavigator();
const defaultNavigationOptions = {
    headerStyle: {
        backgroundColor: theme.sidebarHeaderBg,
    },
    headerTitleStyle: {
        marginHorizontal: 0,
        left: 0,
        color: theme.sidebarHeaderTextColor,
    },
    headerBackTitleStyle: {
        color: theme.sidebarHeaderTextColor,
        margin: 0,
    },
    headerTintColor: theme.sidebarHeaderTextColor,
};

function renderStack() {
    return (
        <Stack.Navigator
            initialRouteName='Post'
            screenOptions={defaultNavigationOptions}
        >
            <Stack.Screen
                name='Post'
                component={ExtensionPost}
            />
            <Stack.Screen
                name='Teams'
                component={ExtensionTeams}
            />
            <Stack.Screen
                name='Channels'
                component={ExtensionChannels}
            />
        </Stack.Navigator>
    );
}

export default function ExtensionNavigation() {
    return (
        <NavigationContainer>
            {renderStack()}
        </NavigationContainer>
    );
}

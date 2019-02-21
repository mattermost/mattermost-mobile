// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createAppContainer, createStackNavigator} from 'react-navigation';

import {Preferences} from 'mattermost-redux/constants';

import ExtensionChannels from './extension_channels';
import ExtensionPost from './extension_post';
import ExtensionTeams from './extension_teams';

const theme = Preferences.THEMES.default;
const Navigation = createStackNavigator({
    Post: {
        screen: ExtensionPost,
    },
    Teams: {
        screen: ExtensionTeams,
    },
    Channels: {
        screen: ExtensionChannels,
    },
}, {
    defaultNavigationOptions: {
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
    },
});

export default createAppContainer(Navigation);

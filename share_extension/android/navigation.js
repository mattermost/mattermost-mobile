// // Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// // See License.txt for license information.

import {StackNavigator as stackNavigator} from 'react-navigation';

import {Preferences} from 'mattermost-redux/constants';

import ExtensionChannels from './extension_channels';
import ExtensionPost from './extension_post';
import ExtensionTeams from './extension_teams';

const theme = Preferences.THEMES.default;
const Navigation = stackNavigator({
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
    navigationOptions: {
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

export default Navigation;

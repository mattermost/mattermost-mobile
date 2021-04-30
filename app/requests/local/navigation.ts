// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import merge from 'deepmerge';
import {Platform} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {Store} from 'react-native-navigation/lib/dist/components/Store';

//fixme: to needful here for the whole file

function getThemeFromState() {
    const state = Store.redux?.getState() || {};

    return getTheme(state);
}

export function goToScreen(name, title, passProps = {}, options = {}) {
    const theme = getThemeFromState();
    const componentId = EphemeralStore.getNavigationTopComponentId();
    const defaultOptions = {
        layout: {
            componentBackgroundColor: theme.centerChannelBg,
        },
        popGesture: true,
        sideMenu: {
            left: {enabled: false},
            right: {enabled: false},
        },
        topBar: {
            animate: true,
            visible: true,
            backButton: {
                color: theme.sidebarHeaderTextColor,
                enableMenu: false,
                title: '',
                testID: 'screen.back.button',
            },
            background: {
                color: theme.sidebarHeaderBg,
            },
            title: {
                color: theme.sidebarHeaderTextColor,
                text: title,
            },
        },
    };

    Navigation.push(componentId, {
        component: {
            id: name,
            name,
            passProps,
            options: merge(defaultOptions, options),
        },
    });
}

export function resetToChannel(passProps = {}) {
    const theme = getThemeFromState();

    EphemeralStore.clearNavigationComponents();

    const stack = {
        children: [{
            component: {
                id: NavigationTypes.CHANNEL_SCREEN,
                name: NavigationTypes.CHANNEL_SCREEN,
                passProps,
                options: {
                    layout: {
                        componentBackgroundColor: theme.centerChannelBg,
                    },
                    statusBar: {
                        visible: true,
                    },
                    topBar: {
                        visible: false,
                        height: 0,
                        background: {
                            color: theme.sidebarHeaderBg,
                        },
                        backButton: {
                            visible: false,
                            color: theme.sidebarHeaderTextColor,
                            enableMenu: false,
                        },
                    },
                },
            },
        }],
    };

    let platformStack = {stack};
    if (Platform.OS === 'android') {
        platformStack = {
            sideMenu: {
                left: {
                    component: {
                        id: 'MainSidebar',
                        name: 'MainSidebar',
                    },
                },
                center: {
                    stack,
                },
                right: {
                    component: {
                        id: 'SettingsSidebar',
                        name: 'SettingsSidebar',
                    },
                },
            },
        };
    }

    Navigation.setRoot({
        root: {
            ...platformStack,
        },
    });
}

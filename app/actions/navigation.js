// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Navigation} from 'react-native-navigation';

import merge from 'deepmerge';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

export function resetToChannel() {
    return (dispatch, getState) => {
        const theme = getTheme(getState());

        Navigation.setRoot({
            root: {
                stack: {
                    children: [{
                        component: {
                            name: 'Channel',
                            options: {
                                layout: {
                                    backgroundColor: 'transparent',
                                },
                                statusBar: {
                                    visible: true,
                                },
                                topBar: {
                                    backButton: {
                                        color: theme.sidebarHeaderTextColor,
                                        title: '',
                                    },
                                    background: {
                                        color: theme.sidebarHeaderBg,
                                    },
                                    title: {
                                        color: theme.sidebarHeaderTextColor,
                                    },
                                    visible: false,
                                    height: 0,
                                },
                            },
                        },
                    }],
                },
            },
        });
    };
}

export function resetToSelectServer(allowOtherServers) {
    return (dispatch, getState) => {
        const theme = getTheme(getState());

        Navigation.setRoot({
            root: {
                stack: {
                    children: [{
                        component: {
                            name: 'SelectServer',
                            passProps: {
                                allowOtherServers,
                            },
                            options: {
                                statusBar: {
                                    visible: true,
                                },
                                topBar: {
                                    backButton: {
                                        color: theme.sidebarHeaderTextColor,
                                        title: '',
                                    },
                                    background: {
                                        color: theme.sidebarHeaderBg,
                                    },
                                    visible: false,
                                    height: 0,
                                },
                            },
                        },
                    }],
                },
            },
        });
    };
}

export function goToScreen(componentId, name, title, passProps = {}, options = {}) {
    return (dispatch, getState) => {
        const theme = getTheme(getState());
        const defaultOptions = {
            layout: {
                backgroundColor: theme.centerChannelBg,
            },
            topBar: {
                animate: true,
                visible: true,
                backButton: {
                    color: theme.sidebarHeaderTextColor,
                    title: '',
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
                name,
                passProps,
                options: merge(defaultOptions, options),
            },
        });
    };
}
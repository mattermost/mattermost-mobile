// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Navigation} from 'react-native-navigation';

import merge from 'deepmerge';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

export function resetToChannel(passProps = {}) {
    return (dispatch, getState) => {
        const theme = getTheme(getState());

        Navigation.setRoot({
            root: {
                stack: {
                    children: [{
                        component: {
                            name: 'Channel',
                            passProps,
                            options: {
                                layout: {
                                    backgroundColor: 'transparent',
                                },
                                statusBar: {
                                    visible: true,
                                },
                                topBar: {
                                    visible: false,
                                    height: 0,
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

export function resetToTeams(name, title, passProps = {}, options = {}) {
    return (dispatch, getState) => {
        const theme = getTheme(getState());
        const defaultOptions = {
            layout: {
                backgroundColor: theme.centerChannelBg,
            },
            statusBar: {
                visible: true,
            },
            topBar: {
                visible: true,
                title: {
                    color: theme.sidebarHeaderTextColor,
                    text: title,
                },
                backButton: {
                    color: theme.sidebarHeaderTextColor,
                    title: '',
                },
                background: {
                    color: theme.sidebarHeaderBg,
                },
            },
        };

        Navigation.setRoot({
            root: {
                stack: {
                    children: [{
                        component: {
                            name,
                            passProps,
                            options: merge(defaultOptions, options),
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

export function showModal(name, title, passProps = {}, options = {}) {
    return (dispatch, getState) => {
        const theme = getTheme(getState());
        const defaultOptions = {
            layout: {
                backgroundColor: theme.centerChannelBg,
            },
            statusBar: {
                visible: true,
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

        Navigation.showModal({
            stack: {
                children: [{
                    component: {
                        name,
                        passProps,
                        options: merge(defaultOptions, options),
                    },
                }],
            },
        });
    };
}

export function peek(componentId, name, passProps = {}, options = {}) {
    return () => {
        const defaultOptions = {
            preview: {
                commit: false,
                height: 300,
                width: 300,
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
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import {Navigation} from 'react-native-navigation';

import merge from 'deepmerge';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import EphemeralStore from 'app/store/ephemeral_store';

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

export function goToScreen(name, title, passProps = {}, options = {}) {
    return (dispatch, getState) => {
        const state = getState();
        const componentId = EphemeralStore.getTopComponentId();
        const theme = getTheme(state);
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

export function popTopScreen() {
    return () => {
        const componentId = EphemeralStore.getTopComponentId();

        Navigation.pop(componentId);
    };
}

export function popToRoot() {
    return () => {
        const componentId = EphemeralStore.getTopComponentId();

        Navigation.popToRoot(componentId);
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
                leftButtonColor: theme.sidebarHeaderTextColor,
                rightButtonColor: theme.sidebarHeaderTextColor,
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

export function showModalOverCurrentContext(name, passProps = {}, options = {}) {
    return (dispatch) => {
        const title = '';
        const animationsEnabled = (Platform.OS === 'android').toString();
        const defaultOptions = {
            modalPresentationStyle: 'overCurrentContext',
            layout: {
                backgroundColor: 'transparent',
            },
            topBar: {
                visible: false,
                height: 0,
            },
            animations: {
                showModal: {
                    enabled: animationsEnabled,
                    alpha: {
                        from: 0,
                        to: 1,
                        duration: 250,
                    },
                },
                dismissModal: {
                    enabled: animationsEnabled,
                    alpha: {
                        from: 1,
                        to: 0,
                        duration: 250,
                    },
                },
            },
        };
        const mergeOptions = merge(defaultOptions, options);

        dispatch(showModal(name, title, passProps, mergeOptions));
    };
}

export function showSearchModal(initialValue = '') {
    return (dispatch) => {
        const name = 'Search';
        const title = '';
        const passProps = {initialValue};
        const options = {
            topBar: {
                visible: false,
                height: 0,
            },
        };

        dispatch(showModal(name, title, passProps, options));
    };
}

export function dismissModal(options = {}) {
    return () => {
        const componentId = EphemeralStore.getTopComponentId();

        Navigation.dismissModal(componentId, options);
    };
}

export function dismissAllModals(options = {}) {
    return () => {
        Navigation.dismissAllModals(options);
    };
}

export function peek(name, passProps = {}, options = {}) {
    return () => {
        const componentId = EphemeralStore.getTopComponentId();
        const defaultOptions = {
            preview: {
                commit: false,
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

export function setButtons(componentId, buttons = {leftButtons: [], rightButtons: []}) {
    return () => {
        Navigation.mergeOptions(componentId, {
            topBar: {
                ...buttons,
            },
        });
    };
}

export function showOverlay(name, passProps, options = {}) {
    return () => {
        const defaultOptions = {
            overlay: {
                position: 'top',
                autoDismissTimerSec: 5,
                dismissWithSwipe: true,
            },
        };

        Navigation.showOverlay({
            component: {
                name,
                passProps,
                options: merge(defaultOptions, options),
            },
        });
    };
}

export function dismissOverlay(componentId) {
    return () => {
        Navigation.dismissOverlay(componentId);
    };
}

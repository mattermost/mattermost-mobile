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
        const componentId = EphemeralStore.getNavigationTopComponentId();
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

export function popTopScreen(screenId) {
    return () => {
        if (screenId) {
            Navigation.pop(screenId);
        } else {
            const componentId = EphemeralStore.getNavigationTopComponentId();
            Navigation.pop(componentId);
        }
    };
}

export function popToRoot() {
    return () => {
        const componentId = EphemeralStore.getNavigationTopComponentId();

        Navigation.popToRoot(componentId).catch(() => {
            // RNN returns a promise rejection if there are no screens
            // atop the root screen to pop. We'll do nothing in this
            // case but we will catch the rejection here so that the
            // caller doesn't have to.
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
        const componentId = EphemeralStore.getNavigationTopComponentId();

        Navigation.dismissModal(componentId, options).catch(() => {
            // RNN returns a promise rejection if there is no modal to
            // dismiss. We'll do nothing in this case but we will catch
            // the rejection here so that the caller doesn't have to.
        });
    };
}

export function dismissAllModals(options = {}) {
    return () => {
        Navigation.dismissAllModals(options).catch(() => {
            // RNN returns a promise rejection if there are no modals to
            // dismiss. We'll do nothing in this case but we will catch
            // the rejection here so that the caller doesn't have to.
        });
    };
}

export function peek(name, passProps = {}, options = {}) {
    return () => {
        const componentId = EphemeralStore.getNavigationTopComponentId();
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
                interceptTouchOutside: false,
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
        return Navigation.dismissOverlay(componentId).catch(() => {
            // RNN returns a promise rejection if there is no modal with
            // this componentId to dismiss. We'll do nothing in this case
            // but we will catch the rejection here so that the caller
            // doesn't have to.
        });
    };
}

export function applyTheme(componentId, skipBackButtonStyle = false) {
    return (dispatch, getState) => {
        const theme = getTheme(getState());

        let backButton = {
            color: theme.sidebarHeaderTextColor,
        };

        if (skipBackButtonStyle && Platform.OS === 'android') {
            backButton = null;
        }

        Navigation.mergeOptions(componentId, {
            topBar: {
                backButton,
                background: {
                    color: theme.sidebarHeaderBg,
                },
                title: {
                    color: theme.sidebarHeaderTextColor,
                },
            },
        });
    };
}

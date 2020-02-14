// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import {Appearance} from 'react-native-appearance';
import {Navigation} from 'react-native-navigation';

import merge from 'deepmerge';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import store from 'app/store';
import EphemeralStore from 'app/store/ephemeral_store';
import {getColorStyles} from 'app/utils/appearance';

function getThemeFromState() {
    const state = store.getState();

    return getTheme(state);
}

export function resetToChannel(passProps = {}) {
    const theme = getThemeFromState();

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
}

export function resetToSelectServer(allowOtherServers) {
    const colorStyles = getColorStyles(Appearance.getColorScheme());

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
                                    color: colorStyles.navigation.color,
                                    title: '',
                                },
                                background: {
                                    color: colorStyles.navigation.backgroundColor,
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
}

export function resetToTeams(name, title, passProps = {}, options = {}) {
    const theme = getThemeFromState();
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
}

export function goToScreen(name, title, passProps = {}, options = {}) {
    const theme = getThemeFromState();
    const componentId = EphemeralStore.getNavigationTopComponentId();
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
}

export function popTopScreen(screenId) {
    if (screenId) {
        Navigation.pop(screenId);
    } else {
        const componentId = EphemeralStore.getNavigationTopComponentId();
        Navigation.pop(componentId);
    }
}

export async function popToRoot() {
    const componentId = EphemeralStore.getNavigationTopComponentId();

    try {
        await Navigation.popToRoot(componentId);
    } catch (error) {
        // RNN returns a promise rejection if there are no screens
        // atop the root screen to pop. We'll do nothing in this case.
    }
}

export function showModal(name, title, passProps = {}, options = {}) {
    const theme = getThemeFromState();
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
}

export function showModalOverCurrentContext(name, passProps = {}, options = {}) {
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

    showModal(name, title, passProps, mergeOptions);
}

export function showSearchModal(initialValue = '') {
    const name = 'Search';
    const title = '';
    const passProps = {initialValue};
    const options = {
        topBar: {
            visible: false,
            height: 0,
        },
    };

    showModal(name, title, passProps, options);
}

export async function dismissModal(options = {}) {
    const componentId = EphemeralStore.getNavigationTopComponentId();

    try {
        await Navigation.dismissModal(componentId, options);
    } catch (error) {
        // RNN returns a promise rejection if there is no modal to
        // dismiss. We'll do nothing in this case.
    }
}

export async function dismissAllModals(options = {}) {
    try {
        await Navigation.dismissAllModals(options);
    } catch (error) {
        // RNN returns a promise rejection if there are no modals to
        // dismiss. We'll do nothing in this case.
    }
}

export function peek(name, passProps = {}, options = {}) {
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
}

export function setButtons(componentId, buttons = {leftButtons: [], rightButtons: []}) {
    const options = {
        topBar: {
            ...buttons,
        },
    };

    mergeNavigationOptions(componentId, options);
}

export function mergeNavigationOptions(componentId, options) {
    Navigation.mergeOptions(componentId, options);
}

export function showOverlay(name, passProps, options = {}) {
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
}

export async function dismissOverlay(componentId) {
    try {
        await Navigation.dismissOverlay(componentId);
    } catch (error) {
        // RNN returns a promise rejection if there is no modal with
        // this componentId to dismiss. We'll do nothing in this case.
    }
}

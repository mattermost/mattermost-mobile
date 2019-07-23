// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import {Navigation} from 'react-native-navigation';

import merge from 'deepmerge';

import {getTheme as getThemeRedux} from 'mattermost-redux/selectors/entities/preferences';

import {General, Preferences} from 'app/constants';
import {getDefaultThemeFromConfig} from 'app/selectors/theme';
import {getTheme} from 'app/realm/selectors/theme';
import EphemeralStore from 'app/store/ephemeral_store';

function getThemePrefsFromRealm(realm) {
    try {
        const general = realm.objects('General').filtered(`id="${General.REALM_SCHEMA_ID}"`);
        const themePreference = realm.objects('Preference').filtered(`category="${Preferences.CATEGORY_THEME}"`);
        return [general, themePreference];
    } catch (e) {
        return [];
    }
}

// TODO: Remove when redux is no longer in use
function getReduxOrRealmTheme(state) {
    const [general, themePreference] = getThemePrefsFromRealm(state);

    if (general && themePreference) {
        return getTheme(general, themePreference);
    }

    if (state.entities) {
        return getThemeRedux(state);
    }

    return getDefaultThemeFromConfig();
}

export function resetToChannel(passProps = {}) {
    return (dispatch, getState) => {
        const theme = getReduxOrRealmTheme(getState());

        Navigation.setDefaultOptions({
            topBar: {
                backButton: {
                    color: theme.sidebarHeaderTextColor,
                },
                background: {
                    color: theme.sidebarHeaderBg,
                },
                title: {
                    color: theme.sidebarHeaderTextColor,
                },
            },
        });

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
        const theme = getReduxOrRealmTheme(getState());

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
        const theme = getReduxOrRealmTheme(getState());

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
        const componentId = EphemeralStore.getNavigationTopComponentId();
        const theme = getReduxOrRealmTheme(getState());
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
        const componentId = EphemeralStore.getNavigationTopComponentId();

        Navigation.pop(componentId);
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
        const theme = getReduxOrRealmTheme(getState());
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

        Navigation.dismissModal(componentId, options);
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

export function applyTheme() {
    return (dispatch, getState) => {
        const theme = getReduxOrRealmTheme(getState());

        EphemeralStore.getNavigationComponentIds().forEach((componentId) => {
            Navigation.mergeOptions(componentId, {
                topBar: {
                    backButton: {
                        color: theme.sidebarHeaderTextColor,
                    },
                    background: {
                        color: theme.sidebarHeaderBg,
                    },
                    title: {
                        color: theme.sidebarHeaderTextColor,
                    },
                },
            });
        });
    };
}

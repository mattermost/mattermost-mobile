// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import merge from 'deepmerge';
import {Appearance, DeviceEventEmitter, NativeModules, StatusBar, Platform} from 'react-native';
import {Navigation, Options, OptionsModalPresentationStyle} from 'react-native-navigation';
import tinyColor from 'tinycolor2';

import CompassIcon from '@components/compass_icon';
import {Device, Preferences, Screens} from '@constants';
import NavigationConstants from '@constants/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {NavButtons} from '@typings/screens/navigation';
import {changeOpacity, setNavigatorStyles} from '@utils/theme';

import type {LaunchProps} from '@typings/launch';

const {MattermostManaged} = NativeModules;
const isRunningInSplitView = MattermostManaged.isRunningInSplitView;
const appearanceControlledScreens = [Screens.SERVER, Screens.LOGIN, Screens.FORGOT_PASSWORD, Screens.MFA];

const alpha = {
    from: 0,
    to: 1,
    duration: 150,
};

export const loginAnimationOptions = () => {
    const theme = getThemeFromState();
    return {
        topBar: {
            visible: true,
            drawBehind: true,
            translucid: true,
            noBorder: true,
            elevation: 0,
            background: {
                color: 'transparent',
            },
            backButton: {
                color: changeOpacity(theme.centerChannelColor, 0.56),
            },
            scrollEdgeAppearance: {
                active: true,
                noBorder: true,
                translucid: true,
            },
        },
        animations: {
            topBar: {
                alpha,
            },
            push: {
                waitForRender: true,
                content: {
                    alpha,
                },
            },
            pop: {
                content: {
                    alpha: {
                        from: 1,
                        to: 0,
                        duration: 100,
                    },
                },
            },
        },
    };
};

Navigation.setDefaultOptions({
    layout: {

        //@ts-expect-error all not defined in type definition
        orientation: [Device.IS_TABLET ? 'all' : 'portrait'],
    },
});

Appearance.addChangeListener(() => {
    const theme = getThemeFromState();
    const screens = EphemeralStore.getAllNavigationComponents();
    if (screens.includes(Screens.SERVER)) {
        for (const screen of screens) {
            if (appearanceControlledScreens.includes(screen)) {
                Navigation.updateProps(screen, {theme});
                setNavigatorStyles(screen, theme, loginAnimationOptions(), theme.centerChannelBg);
            }
        }
    }
});

function getThemeFromState(): Theme {
    if (EphemeralStore.theme) {
        return EphemeralStore.theme;
    }
    if (Appearance.getColorScheme() === 'dark') {
        return Preferences.THEMES.onyx;
    }
    return Preferences.THEMES.denim;
}

export function resetToHome(passProps = {}) {
    const theme = getThemeFromState();
    const isDark = tinyColor(theme.sidebarBg).isDark();
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');

    EphemeralStore.clearNavigationComponents();

    const stack = {
        children: [{
            component: {
                id: Screens.HOME,
                name: Screens.HOME,
                passProps,
                options: {
                    layout: {
                        componentBackgroundColor: theme.centerChannelBg,
                    },
                    statusBar: {
                        visible: true,
                        backgroundColor: theme.sidebarBg,
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
                        },
                    },
                },
            },
        }],
    };

    Navigation.setRoot({
        root: {stack},
    });
}

export function resetToSelectServer(passProps: LaunchProps) {
    const theme = getThemeFromState();
    const isDark = tinyColor(theme.centerChannelBg).isDark();
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');

    EphemeralStore.clearNavigationComponents();

    const children = [{
        component: {
            id: Screens.SERVER,
            name: Screens.SERVER,
            passProps: {
                ...passProps,
                theme,
            },
            options: {
                layout: {
                    backgroundColor: theme.centerChannelBg,
                    componentBackgroundColor: theme.centerChannelBg,
                },
                statusBar: {
                    visible: true,
                    backgroundColor: theme.sidebarBg,
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
    }];

    Navigation.setRoot({
        root: {
            stack: {
                children,
            },
        },
    });
}

export function resetToTeams(name: string, title: string, passProps = {}, options = {}) {
    const theme = getThemeFromState();
    const isDark = tinyColor(theme.sidebarBg).isDark();
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');

    const defaultOptions = {
        layout: {
            componentBackgroundColor: theme.centerChannelBg,
        },
        statusBar: {
            visible: true,
            backgroundColor: theme.sidebarBg,
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

    EphemeralStore.clearNavigationComponents();

    Navigation.setRoot({
        root: {
            stack: {
                children: [{
                    component: {
                        id: name,
                        name,
                        passProps,
                        options: merge(defaultOptions, options),
                    },
                }],
            },
        },
    });
}

export function goToScreen(name: string, title: string, passProps = {}, options = {}) {
    const theme = getThemeFromState();
    const isDark = tinyColor(theme.sidebarBg).isDark();
    const componentId = EphemeralStore.getNavigationTopComponentId();
    DeviceEventEmitter.emit('tabBarVisible', false);
    const defaultOptions: Options = {
        layout: {
            componentBackgroundColor: theme.centerChannelBg,
        },
        popGesture: true,
        sideMenu: {
            left: {enabled: false},
            right: {enabled: false},
        },
        statusBar: {
            backgroundColor: null,
            style: isDark ? 'light' : 'dark',
        },
        topBar: {
            animate: true,
            visible: true,
            backButton: {
                color: theme.sidebarHeaderTextColor,
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

export function popTopScreen(screenId?: string) {
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

export async function dismissAllModalsAndPopToRoot() {
    await dismissAllModals();
    await popToRoot();

    DeviceEventEmitter.emit(NavigationConstants.NAVIGATION_DISMISS_AND_POP_TO_ROOT);
}

/**
 * Dismisses All modals in the stack and pops the stack to the desired screen
 * (if the screen is not in the stack, it will push a new one)
 * @param screenId Screen to pop or display
 * @param title Title to be shown in the top bar
 * @param passProps Props to pass to the screen (Only if the screen does not exist in the stack)
 * @param options Navigation options
 */
export async function dismissAllModalsAndPopToScreen(screenId: string, title: string, passProps = {}, options = {}) {
    await dismissAllModals();
    if (EphemeralStore.getNavigationComponents().includes(screenId)) {
        let mergeOptions = options;
        if (title) {
            mergeOptions = merge(mergeOptions, {
                topBar: {
                    title: {
                        text: title,
                    },
                },
            });
        }
        try {
            await Navigation.popTo(screenId, mergeOptions);
        } catch {
            // catch in case there is nothing to pop
        }
    } else {
        goToScreen(screenId, title, passProps, options);
    }
}

export function showModal(name: string, title: string, passProps = {}, options = {}) {
    const theme = getThemeFromState();
    const modalPresentationStyle: OptionsModalPresentationStyle = Platform.OS === 'ios' ? OptionsModalPresentationStyle.pageSheet : OptionsModalPresentationStyle.none;
    const defaultOptions: Options = {
        modalPresentationStyle,
        layout: {
            componentBackgroundColor: theme.centerChannelBg,
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

    EphemeralStore.addNavigationModal(name);
    Navigation.showModal({
        stack: {
            children: [{
                component: {
                    id: name,
                    name,
                    passProps: {
                        ...passProps,
                        isModal: true,
                    },
                    options: merge(defaultOptions, options),
                },
            }],
        },
    });
}

export function showModalOverCurrentContext(name: string, passProps = {}, options = {}) {
    const title = '';
    let animations;
    switch (Platform.OS) {
        case 'android':
            animations = {
                showModal: {
                    waitForRender: true,
                    alpha: {
                        from: 0,
                        to: 1,
                        duration: 250,
                    },
                },
                dismissModal: {
                    alpha: {
                        from: 1,
                        to: 0,
                        duration: 250,
                    },
                },
            };
            break;
        default:
            animations = {
                showModal: {
                    alpha: {
                        from: 0,
                        to: 1,
                        duration: 250,
                    },
                },
                dismissModal: {
                    enter: {
                        enabled: false,
                    },
                    exit: {
                        enabled: false,
                    },
                },
            };
            break;
    }
    const defaultOptions = {
        modalPresentationStyle: 'overCurrentContext',
        layout: {
            backgroundColor: 'transparent',
            componentBackgroundColor: 'transparent',
        },
        topBar: {
            visible: false,
            height: 0,
        },
        animations,
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
        ...Platform.select({
            ios: {
                modalPresentationStyle: 'pageSheet',
            },
        }),
    };

    showModal(name, title, passProps, options);
}

export async function dismissModal(options?: Options & { componentId: string}) {
    if (!EphemeralStore.hasModalsOpened()) {
        return;
    }

    const componentId = options?.componentId || EphemeralStore.getNavigationTopModalId();
    if (componentId) {
        try {
            await Navigation.dismissModal(componentId, options);
            EphemeralStore.removeNavigationModal(componentId);
        } catch (error) {
            // RNN returns a promise rejection if there is no modal to
            // dismiss. We'll do nothing in this case.
        }
    }
}

export async function dismissAllModals(options: Options = {}) {
    if (!EphemeralStore.hasModalsOpened()) {
        return;
    }

    try {
        await Navigation.dismissAllModals(options);
        EphemeralStore.clearNavigationModals();
    } catch (error) {
        // RNN returns a promise rejection if there are no modals to
        // dismiss. We'll do nothing in this case.
    }
}

export function setButtons(componentId: string, buttons: NavButtons = {leftButtons: [], rightButtons: []}) {
    const options = {
        topBar: {
            ...buttons,
        },
    };

    mergeNavigationOptions(componentId, options);
}

export function mergeNavigationOptions(componentId: string, options: Options) {
    Navigation.mergeOptions(componentId, options);
}

export function showOverlay(name: string, passProps = {}, options = {}) {
    const defaultOptions = {
        layout: {
            backgroundColor: 'transparent',
            componentBackgroundColor: 'transparent',
        },
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

export async function dismissOverlay(componentId: string) {
    try {
        await Navigation.dismissOverlay(componentId);
    } catch (error) {
        // RNN returns a promise rejection if there is no modal with
        // this componentId to dismiss. We'll do nothing in this case.
    }
}

type BottomSheetArgs = {
    closeButtonId: string;
    renderContent: () => JSX.Element;
    snapPoints: number[];
    theme: Theme;
    title: string;
}

export async function bottomSheet({title, renderContent, snapPoints, theme, closeButtonId}: BottomSheetArgs) {
    const {isSplitView} = await isRunningInSplitView();
    const isTablet = Device.IS_TABLET && !isSplitView;

    if (isTablet) {
        const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.centerChannelColor);
        showModal(Screens.BOTTOM_SHEET, title, {
            closeButtonId,
            renderContent,
            snapPoints,
        }, {
            modalPresentationStyle: OptionsModalPresentationStyle.formSheet,
            swipeToDismiss: true,
            topBar: {
                leftButtons: [{
                    id: closeButtonId,
                    icon: closeButton,
                    testID: closeButtonId,
                }],
                leftButtonColor: changeOpacity(theme.centerChannelColor, 0.56),
                background: {
                    color: theme.centerChannelBg,
                },
                title: {
                    color: theme.centerChannelColor,
                },
            },
        });
    } else {
        showModalOverCurrentContext(Screens.BOTTOM_SHEET, {
            renderContent,
            snapPoints,
        }, {swipeToDismiss: true});
    }
}

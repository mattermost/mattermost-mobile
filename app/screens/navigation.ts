// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import merge from 'deepmerge';
import {Appearance, DeviceEventEmitter, NativeModules, StatusBar, Platform, Alert} from 'react-native';
import {Navigation, Options, OptionsModalPresentationStyle} from 'react-native-navigation';
import tinyColor from 'tinycolor2';

import CompassIcon from '@components/compass_icon';
import {Device, Events, Screens} from '@constants';
import NavigationConstants from '@constants/navigation';
import {getDefaultThemeByAppearance} from '@context/theme';
import EphemeralStore from '@store/ephemeral_store';
import {LaunchProps, LaunchType} from '@typings/launch';
import {NavButtons} from '@typings/screens/navigation';
import {changeOpacity, setNavigatorStyles} from '@utils/theme';

const {MattermostManaged} = NativeModules;
const isRunningInSplitView = MattermostManaged.isRunningInSplitView;
export const appearanceControlledScreens = [Screens.SERVER, Screens.LOGIN, Screens.FORGOT_PASSWORD, Screens.MFA, Screens.SSO];

const alpha = {
    from: 0,
    to: 1,
    duration: 150,
};

export const loginAnimationOptions = () => {
    const theme = getThemeFromState();
    return {
        layout: {
            backgroundColor: theme.centerChannelBg,
            componentBackgroundColor: theme.centerChannelBg,
        },
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

export const bottomSheetModalOptions = (theme: Theme, closeButtonId: string) => {
    const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.centerChannelColor);
    return {
        modalPresentationStyle: OptionsModalPresentationStyle.formSheet,
        modal: {
            swipeToDismiss: true,
        },
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

    return getDefaultThemeByAppearance();
}

// This is a temporary helper function to avoid
// crashes when trying to load a screen that does
// NOT exists, this should be removed for GA
function isScreenRegistered(screen: string) {
    const exists = Object.values(Screens).includes(screen);

    if (!exists) {
        Alert.alert(
            'Temporary error ' + screen,
            'The functionality you are trying to use has not been implemented yet',
        );
    }

    return exists;
}

export function resetToHome(passProps: LaunchProps = {launchType: LaunchType.Normal}) {
    const theme = getThemeFromState();
    const isDark = tinyColor(theme.sidebarBg).isDark();
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');

    if (passProps.launchType === LaunchType.AddServer) {
        dismissModal({componentId: Screens.SERVER});
        dismissModal({componentId: Screens.BOTTOM_SHEET});
        return;
    }

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
    const theme = getDefaultThemeByAppearance();
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
    if (!isScreenRegistered(name)) {
        return;
    }

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
    if (!isScreenRegistered(name)) {
        return;
    }

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
    if (!isScreenRegistered(name)) {
        return;
    }

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
    initialSnapIndex?: number;
    renderContent: () => JSX.Element;
    snapPoints: Array<number | string>;
    theme: Theme;
    title: string;
}

export async function bottomSheet({title, renderContent, snapPoints, initialSnapIndex = 0, theme, closeButtonId}: BottomSheetArgs) {
    const {isSplitView} = await isRunningInSplitView();
    const isTablet = Device.IS_TABLET && !isSplitView;

    if (isTablet) {
        showModal(Screens.BOTTOM_SHEET, title, {
            closeButtonId,
            initialSnapIndex,
            renderContent,
            snapPoints,
        }, bottomSheetModalOptions(theme, closeButtonId));
    } else {
        showModalOverCurrentContext(Screens.BOTTOM_SHEET, {
            initialSnapIndex,
            renderContent,
            snapPoints,
        }, {modal: {swipeToDismiss: true}});
    }
}

export async function dismissBottomSheet(alternativeScreen = Screens.BOTTOM_SHEET) {
    DeviceEventEmitter.emit(Events.CLOSE_BOTTOM_SHEET);
    await EphemeralStore.waitUntilScreensIsRemoved(alternativeScreen);
}

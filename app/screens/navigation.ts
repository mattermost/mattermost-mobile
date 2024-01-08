// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import merge from 'deepmerge';
import {Appearance, DeviceEventEmitter, StatusBar, Platform, Alert, type EmitterSubscription} from 'react-native';
import {type ComponentWillAppearEvent, type ImageResource, type LayoutOrientation, Navigation, type Options, OptionsModalPresentationStyle, type OptionsTopBarButton, type ScreenPoppedEvent, type EventSubscription} from 'react-native-navigation';
import tinyColor from 'tinycolor2';

import CompassIcon from '@components/compass_icon';
import {Events, Screens, Launch} from '@constants';
import {NOT_READY} from '@constants/screens';
import {getDefaultThemeByAppearance} from '@context/theme';
import EphemeralStore from '@store/ephemeral_store';
import NavigationStore from '@store/navigation_store';
import {isTablet} from '@utils/helpers';
import {logError} from '@utils/log';
import {appearanceControlledScreens, mergeNavigationOptions} from '@utils/navigation';
import {changeOpacity, setNavigatorStyles} from '@utils/theme';

import type {BottomSheetFooterProps} from '@gorhom/bottom-sheet';
import type {LaunchProps} from '@typings/launch';
import type {AvailableScreens, NavButtons} from '@typings/screens/navigation';

const alpha = {
    from: 0,
    to: 1,
    duration: 150,
};
let subscriptions: Array<EmitterSubscription | EventSubscription> | undefined;

export const allOrientations: LayoutOrientation[] = ['sensor', 'sensorLandscape', 'sensorPortrait', 'landscape', 'portrait'];
export const portraitOrientation: LayoutOrientation[] = ['portrait'];

export function registerNavigationListeners() {
    subscriptions?.forEach((v) => v.remove());
    subscriptions = [
        Navigation.events().registerScreenPoppedListener(onPoppedListener),
        Navigation.events().registerCommandListener(onCommandListener),
        Navigation.events().registerComponentWillAppearListener(onScreenWillAppear),
    ];
}

function onCommandListener(name: string, params: any) {
    switch (name) {
        case 'setRoot':
            NavigationStore.clearScreensFromStack();
            NavigationStore.addScreenToStack(params.layout.root.children[0].id);
            break;
        case 'push':
            NavigationStore.addScreenToStack(params.layout.id);
            break;
        case 'showModal':
            NavigationStore.addModalToStack(params.layout.children[0].id);
            break;
        case 'popToRoot':
            NavigationStore.clearScreensFromStack();
            NavigationStore.addScreenToStack(Screens.HOME);
            break;
        case 'popTo':
            NavigationStore.popTo(params.componentId);
            break;
        case 'dismissModal':
            NavigationStore.removeModalFromStack(params.componentId);
            break;
    }

    if (NavigationStore.getVisibleScreen() === Screens.HOME) {
        DeviceEventEmitter.emit(Events.TAB_BAR_VISIBLE, true);
    }
}

function onPoppedListener({componentId}: ScreenPoppedEvent) {
    // screen pop does not trigger registerCommandListener, but does trigger screenPoppedListener
    NavigationStore.removeScreenFromStack(componentId as AvailableScreens);
}

function onScreenWillAppear(event: ComponentWillAppearEvent) {
    if (event.componentId === Screens.HOME) {
        DeviceEventEmitter.emit(Events.TAB_BAR_VISIBLE, true);
    }
}

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
                waitForRender: false,
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

export const bottomSheetModalOptions = (theme: Theme, closeButtonId?: string): Options => {
    if (closeButtonId) {
        const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.centerChannelColor);
        const closeButtonTestId = `${closeButtonId.replace('close-', 'close.').replace(/-/g, '_')}.button`;
        return {
            modalPresentationStyle: OptionsModalPresentationStyle.formSheet,
            topBar: {
                leftButtons: [{
                    id: closeButtonId,
                    icon: closeButton,
                    testID: closeButtonTestId,
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
    }

    return {
        animations: {
            showModal: {
                enabled: false,
            },
            dismissModal: {
                enabled: false,
            },
        },
        modalPresentationStyle: Platform.select({
            ios: OptionsModalPresentationStyle.overFullScreen,
            default: OptionsModalPresentationStyle.overCurrentContext,
        }),
        statusBar: {
            backgroundColor: null,
            drawBehind: true,
            translucent: true,
        },
    };
};

// This locks phones to portrait for all screens while keeps
// all orientations available for Tablets.
Navigation.setDefaultOptions({
    animations: {
        setRoot: {
            enter: {
                waitForRender: true,
                enabled: true,
                alpha: {
                    from: 0,
                    to: 1,
                    duration: 300,
                },
            },
        },
    },
    layout: {
        orientation: isTablet() ? allOrientations : portraitOrientation,
    },
    topBar: {
        title: {
            fontFamily: 'Metropolis-SemiBold',
            fontSize: 18,
            fontWeight: '600',
        },
        backButton: {
            enableMenu: false,
        },
        subtitle: {
            fontFamily: 'OpenSans',
            fontSize: 12,
            fontWeight: '400',
        },
    },
});

Appearance.addChangeListener(() => {
    const theme = getThemeFromState();
    const screens = NavigationStore.getScreensInStack();

    if (screens.includes(Screens.SERVER) || screens.includes(Screens.ONBOARDING)) {
        for (const screen of screens) {
            if (appearanceControlledScreens.has(screen)) {
                Navigation.updateProps(screen, {theme});
                setNavigatorStyles(screen, theme, loginAnimationOptions(), theme.sidebarBg);
            }
        }
    }
});

export function setScreensOrientation(allowRotation: boolean) {
    const options: Options = {
        layout: {
            orientation: allowRotation ? allOrientations : portraitOrientation,
        },
    };
    Navigation.setDefaultOptions(options);
    const screens = NavigationStore.getScreensInStack();
    for (const s of screens) {
        Navigation.mergeOptions(s, options);
    }
}

export function getThemeFromState(): Theme {
    return EphemeralStore.theme || getDefaultThemeByAppearance();
}

// This is a temporary helper function to avoid
// crashes when trying to load a screen that does
// NOT exists, this should be removed for GA
function isScreenRegistered(screen: AvailableScreens) {
    const notImplemented = NOT_READY.includes(screen) || !Object.values(Screens).includes(screen);
    if (notImplemented) {
        Alert.alert(
            'Temporary error ' + screen,
            'The functionality you are trying to use has not been implemented yet',
        );
        return false;
    }

    return true;
}

export function openToS() {
    NavigationStore.setToSOpen(true);
    return showOverlay(Screens.TERMS_OF_SERVICE, {}, {overlay: {interceptTouchOutside: true}});
}

export function resetToHome(passProps: LaunchProps = {launchType: Launch.Normal}) {
    const theme = getThemeFromState();
    const isDark = tinyColor(theme.sidebarBg).isDark();
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');

    if (passProps.launchType === Launch.AddServer || passProps.launchType === Launch.AddServerFromDeepLink) {
        dismissModal({componentId: Screens.SERVER});
        dismissModal({componentId: Screens.LOGIN});
        dismissModal({componentId: Screens.SSO});
        dismissModal({componentId: Screens.BOTTOM_SHEET});
        if (passProps.launchType === Launch.AddServerFromDeepLink) {
            Navigation.updateProps(Screens.HOME, {launchType: Launch.DeepLink, extra: passProps.extra});
        }
        return '';
    }

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
                            color: theme.sidebarBg,
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

    return Navigation.setRoot({
        root: {stack},
    });
}

export function resetToSelectServer(passProps: LaunchProps) {
    const theme = getDefaultThemeByAppearance();
    const isDark = tinyColor(theme.sidebarBg).isDark();
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');

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
                        color: theme.sidebarBg,
                    },
                    visible: false,
                    height: 0,
                },
            },
        },
    }];

    return Navigation.setRoot({
        root: {
            stack: {
                children,
            },
        },
    });
}

export function resetToOnboarding(passProps: LaunchProps) {
    const theme = getDefaultThemeByAppearance();
    const isDark = tinyColor(theme.sidebarBg).isDark();
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');

    const children = [{
        component: {
            id: Screens.ONBOARDING,
            name: Screens.ONBOARDING,
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
                        color: theme.sidebarBg,
                    },
                    visible: false,
                    height: 0,
                },
            },
        },
    }];

    return Navigation.setRoot({
        root: {
            stack: {
                children,
            },
        },
    });
}

export function resetToTeams() {
    const theme = getThemeFromState();
    const isDark = tinyColor(theme.sidebarBg).isDark();
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');

    return Navigation.setRoot({
        root: {
            stack: {
                children: [{
                    component: {
                        id: Screens.SELECT_TEAM,
                        name: Screens.SELECT_TEAM,
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
                                    color: theme.sidebarBg,
                                },
                                backButton: {
                                    visible: false,
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

export function goToScreen(name: AvailableScreens, title: string, passProps = {}, options: Options = {}) {
    if (!isScreenRegistered(name)) {
        return '';
    }

    const theme = getThemeFromState();
    const isDark = tinyColor(theme.sidebarBg).isDark();
    const componentId = NavigationStore.getVisibleScreen();
    if (!componentId) {
        logError('Trying to go to screen without any screen on the navigation store');
        return '';
    }

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
                color: theme.sidebarBg,
            },
            title: {
                color: theme.sidebarHeaderTextColor,
                text: title,
            },
        },
    };

    DeviceEventEmitter.emit(Events.TAB_BAR_VISIBLE, false);

    return Navigation.push(componentId, {
        component: {
            id: name,
            name,
            passProps,
            options: merge(defaultOptions, options),
        },
    });
}

export async function popTopScreen(screenId?: AvailableScreens) {
    try {
        if (screenId) {
            await Navigation.pop(screenId);
        } else {
            const componentId = NavigationStore.getVisibleScreen();
            await Navigation.pop(componentId);
        }
    } catch (error) {
        // RNN returns a promise rejection if there are no screens
        // atop the root screen to pop. We'll do nothing in this case.
    }
}

export async function popToRoot() {
    const componentId = NavigationStore.getVisibleScreen();

    try {
        await Navigation.popToRoot(componentId);
    } catch (error) {
        // RNN returns a promise rejection if there are no screens
        // atop the root screen to pop. We'll do nothing in this case.
    }
}

export async function dismissAllModalsAndPopToRoot() {
    await dismissAllModals();
    await dismissAllOverlays();
    await popToRoot();
}

/**
 * Dismisses All modals in the stack and pops the stack to the desired screen
 * (if the screen is not in the stack, it will push a new one)
 * @param screenId Screen to pop or display
 * @param title Title to be shown in the top bar
 * @param passProps Props to pass to the screen
 * @param options Navigation options
 */
export async function dismissAllModalsAndPopToScreen(screenId: AvailableScreens, title: string, passProps = {}, options = {}) {
    await dismissAllModals();
    await dismissAllOverlays();
    if (NavigationStore.getScreensInStack().includes(screenId)) {
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
            if (Object.keys(passProps).length > 0) {
                await Navigation.updateProps(screenId, passProps);
            }
        } catch {
            // catch in case there is nothing to pop
        }
    } else {
        goToScreen(screenId, title, passProps, options);
    }
}

export function showModal(name: AvailableScreens, title: string, passProps = {}, options: Options = {}) {
    if (!isScreenRegistered(name) || NavigationStore.getVisibleModal() === name) {
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
                color: theme.sidebarBg,
            },
            title: {
                color: theme.sidebarHeaderTextColor,
                text: title,
            },
            leftButtonColor: theme.sidebarHeaderTextColor,
            rightButtonColor: theme.sidebarHeaderTextColor,
        },
        modal: {swipeToDismiss: false},
    };

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

export function showModalOverCurrentContext(name: AvailableScreens, passProps = {}, options: Options = {}) {
    const title = '';
    let animations;
    switch (Platform.OS) {
        case 'android':
            animations = {
                showModal: {
                    waitForRender: false,
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
        modalPresentationStyle: OptionsModalPresentationStyle.overCurrentContext,
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

export async function dismissModal(options?: Options & { componentId: AvailableScreens}) {
    if (!NavigationStore.hasModalsOpened()) {
        return;
    }

    const componentId = options?.componentId || NavigationStore.getVisibleModal();
    if (componentId) {
        try {
            await Navigation.dismissModal(componentId, options);
        } catch (error) {
            // RNN returns a promise rejection if there is no modal to
            // dismiss. We'll do nothing in this case.
        }
    }
}

export async function dismissAllModals() {
    if (!NavigationStore.hasModalsOpened()) {
        return;
    }

    try {
        const modals = [...NavigationStore.getModalsInStack()];
        for await (const modal of modals) {
            await Navigation.dismissModal(modal, {animations: {dismissModal: {enabled: false}}});
        }
    } catch (error) {
        // RNN returns a promise rejection if there are no modals to
        // dismiss. We'll do nothing in this case.
    }
}

export const buildNavigationButton = (id: string, testID: string, icon?: ImageResource, text?: string): OptionsTopBarButton => ({
    fontSize: 16,
    fontFamily: 'OpenSans-SemiBold',
    fontWeight: '600',
    id,
    icon,
    showAsAction: 'always',
    testID,
    text,
});

export function setButtons(componentId: AvailableScreens, buttons: NavButtons = {leftButtons: [], rightButtons: []}) {
    const options = {
        topBar: {
            ...buttons,
        },
    };

    mergeNavigationOptions(componentId, options);
}

export function showOverlay(name: AvailableScreens, passProps = {}, options: Options = {}) {
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

export async function dismissOverlay(componentId: AvailableScreens) {
    try {
        await Navigation.dismissOverlay(componentId);
    } catch (error) {
        // RNN returns a promise rejection if there is no modal with
        // this componentId to dismiss. We'll do nothing in this case.
    }
}

export async function dismissAllOverlays() {
    try {
        await Navigation.dismissAllOverlays();
    } catch {
        // do nothing
    }
}

type BottomSheetArgs = {
    closeButtonId: string;
    initialSnapIndex?: number;
    footerComponent?: React.FC<BottomSheetFooterProps>;
    renderContent: () => Element;
    snapPoints: Array<number | string>;
    theme: Theme;
    title: string;
}

export function bottomSheet({title, renderContent, footerComponent, snapPoints, initialSnapIndex = 1, theme, closeButtonId}: BottomSheetArgs) {
    if (isTablet()) {
        showModal(Screens.BOTTOM_SHEET, title, {
            closeButtonId,
            initialSnapIndex,
            renderContent,
            footerComponent,
            snapPoints,
        }, bottomSheetModalOptions(theme, closeButtonId));
    } else {
        showModalOverCurrentContext(Screens.BOTTOM_SHEET, {
            initialSnapIndex,
            renderContent,
            footerComponent,
            snapPoints,
        }, bottomSheetModalOptions(theme));
    }
}

export async function dismissBottomSheet(alternativeScreen: AvailableScreens = Screens.BOTTOM_SHEET) {
    DeviceEventEmitter.emit(Events.CLOSE_BOTTOM_SHEET);
    await NavigationStore.waitUntilScreensIsRemoved(alternativeScreen);
}

type AsBottomSheetArgs = {
    closeButtonId: string;
    props?: Record<string, any>;
    screen: AvailableScreens;
    theme: Theme;
    title: string;
}

export function openAsBottomSheet({closeButtonId, screen, theme, title, props}: AsBottomSheetArgs) {
    if (isTablet()) {
        showModal(screen, title, {
            closeButtonId,
            ...props,
        }, bottomSheetModalOptions(theme, closeButtonId));
    } else {
        showModalOverCurrentContext(screen, props, bottomSheetModalOptions(theme));
    }
}

export const showAppForm = async (form: AppForm, context: AppContext) => {
    const passProps = {form, context};
    showModal(Screens.APPS_FORM, form.title || '', passProps);
};

export const showReviewOverlay = (hasAskedBefore: boolean) => {
    showOverlay(
        Screens.REVIEW_APP,
        {hasAskedBefore},
        {overlay: {interceptTouchOutside: true}},
    );
};

export const showShareFeedbackOverlay = () => {
    showOverlay(
        Screens.SHARE_FEEDBACK,
        {},
        {overlay: {interceptTouchOutside: true}},
    );
};

export async function findChannels(title: string, theme: Theme) {
    const options: Options = {};
    const closeButtonId = 'close-find-channels';
    const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
    options.topBar = {
        leftButtons: [{
            id: closeButtonId,
            icon: closeButton,
            testID: 'close.find_channels.button',
        }],
    };

    showModal(
        Screens.FIND_CHANNELS,
        title,
        {closeButtonId},
        options,
    );
}

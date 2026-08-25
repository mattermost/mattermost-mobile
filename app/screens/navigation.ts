// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {router} from 'expo-router';
import {DeviceEventEmitter} from 'react-native';

import {Events, Navigation, Screens} from '@constants';
import {UNAUTHENTICATED_SCREENS, HOME_TAB_SCREENS, SCREENS_AS_BOTTOM_SHEET, MODAL_SCREENS} from '@constants/screens';
import BottomSheetStore from '@store/bottom_sheet_store';
import {NavigationStore} from '@store/navigation_store';
import {logError} from '@utils/log';

import type {BottomSheetFooterProps} from '@gorhom/bottom-sheet';
import type {AvailableScreens} from '@typings/screens/navigation';

export function propsToParams(props: any): Record<string, string> {
    return Object.keys(props || {}).reduce((params, key) => {
        params[key] = JSON.stringify(props[key]);
        return params;
    }, {} as Record<string, string>);
}

export function updateParams(props: Record<string, any>) {
    if (router) {
        const params = propsToParams(props);
        router.setParams(params);
    }
}

// Helper to build Expo Router path from screen constant
export function getExpoRouterPath(screen: AvailableScreens, props?: any): string | undefined {
    if (UNAUTHENTICATED_SCREENS.has(screen)) {
        if (props?.isModal) {
            return `/(modals)/(add-server)/${screen}`;
        }
        return `/(unauthenticated)/${screen}`;
    }
    if (HOME_TAB_SCREENS.has(screen)) {
        return `/(authenticated)/(home)/${screen}`;
    }

    if (SCREENS_AS_BOTTOM_SHEET.has(screen)) {
        return `/(bottom_sheet)/${screen}`;
    }

    if (MODAL_SCREENS.has(screen)) {
        return `/(modals)/${screen}`;
    }

    return `/(authenticated)/${screen}`;
}

/**
 * Navigation adapter that works with both RNN and Expo Router
 * Tries Expo Router first, falls back to RNN if not available
 *
 * @param screen - Screen constant from @constants
 * @param title - Screen title (used by RNN, ignored by Expo Router)
 * @param params - Route parameters including theme
 * @param options - RNN layout options (ignored by Expo Router as theme comes from params)
 */
export function navigateToScreen(screen: AvailableScreens, props?: Record<string, unknown>, reset = false) {
    try {
        if (router) {
            const route = getExpoRouterPath(screen, props);
            if (route) {
                const params = propsToParams(props);
                if (reset) {
                    router.replace({pathname: route, params});
                } else {
                    router.push({pathname: route, params});
                }
            }
        }
    } catch (e) {
        logError('navigateToScreen: Expo Router navigation failed', e);
    }
}

export function navigateToScreenWithBaseRoute(baseRoute: string, screen: AvailableScreens, props?: Record<string, unknown>, reset = false) {
    try {
        const pathname = `${baseRoute}/${screen}`;
        const params = propsToParams(props);
        if (reset) {
            router.replace({pathname, params});
        } else {
            router.push({pathname, params});
        }
    } catch (e) {
        logError('navigateToScreenWithBaseRoute: Expo Router navigation failed', e);
    }
}

export async function navigateBack() {
    if (router && router.canGoBack()) {
        router.back();
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
}

export function navigateToHomeTab(params?: Record<string, unknown>) {
    DeviceEventEmitter.emit(Navigation.NAVIGATE_TO_TAB, {
        screen: Screens.CHANNEL_LIST,
        params,
    });
}

export async function dismissToStackRoot() {
    if (router && router.canDismiss()) {
        router.dismissAll();
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
}

export function bottomSheet(renderContent: () => React.ReactNode, snapPoints: Array<string | number>, footerComponent?: (props: BottomSheetFooterProps) => React.ReactNode) {
    DeviceEventEmitter.emit(Events.BLUR_AND_DISMISS_KEYBOARD);
    BottomSheetStore.setSnapPoints(snapPoints);
    BottomSheetStore.setRenderContentCallback(renderContent);
    if (footerComponent) {
        BottomSheetStore.setFooterComponent(footerComponent);
    }

    navigateToScreen(Screens.GENERIC_BOTTOM_SHEET);
}

export async function dismissBottomSheet() {
    const hasRegularSheet = NavigationStore.isScreenInStack(Screens.BOTTOM_SHEET);
    const hasGenericSheet = NavigationStore.isScreenInStack(Screens.GENERIC_BOTTOM_SHEET);
    if (!hasRegularSheet && !hasGenericSheet) {
        return;
    }
    DeviceEventEmitter.emit(Events.CLOSE_BOTTOM_SHEET);

    // Prefer the regular BOTTOM_SHEET when present (historical contract); fall back to
    // GENERIC_BOTTOM_SHEET so callers using the generic variant aren't silently ignored.
    await NavigationStore.waitUntilScreensIsRemoved(hasRegularSheet ? Screens.BOTTOM_SHEET : Screens.GENERIC_BOTTOM_SHEET);
    BottomSheetStore.reset();
    await new Promise((resolve) => setTimeout(resolve, 250));
}

// Dismiss all screens (modals, bottom sheets, stack pushes) and return to channel_list.
// router.dismissTo traverses all navigator boundaries in expo-router 55, so a single call
// handles any stack shape: bottom sheet on top of modals on top of authenticated stack pushes.
export async function navigateToRoot() {
    if (router) {
        router.dismissTo(getExpoRouterPath(Screens.CHANNEL_LIST)!);

        if (router.canDismiss()) {
            router.dismissAll();
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
    }
}

export async function dismissAllRoutesAndPopToScreen(screenId: AvailableScreens, passProps = {}) {
    try {
        if (!router) {
            return;
        }
        const route = getExpoRouterPath(screenId);
        if (!route) {
            return;
        }

        if (NavigationStore.isScreenInStack(screenId)) {
            // dismissTo only resolves divergence at the outermost navigator level
            // it finds. With our nesting (root Stack -> (authenticated) Stack), one
            // call only peels outer routes (modals, bottom sheets). A second call
            // then operates on the inner stack and pops down to the target.
            router.dismissTo(route);
            router.dismissTo(route);
            router.setParams(propsToParams(passProps));
            await new Promise((resolve) => setTimeout(resolve, 250));
        } else {
            // Screen not in stack - reset to root then push target
            await navigateToRoot();
            navigateToScreen(screenId, passProps);
        }
    } catch (e) {
        logError('dismissAllRoutesAndPopToScreen: Expo Router navigation failed', e);
    }
}

export function navigateToSettingsScreen(screen: AvailableScreens, props?: Record<string, unknown>) {
    navigateToScreenWithBaseRoute(`/(modals)/${Screens.SETTINGS}`, screen, props);
}

export function navigateToChannelInfoScreen(screen: AvailableScreens, props?: Record<string, unknown>) {
    navigateToScreenWithBaseRoute(`/(modals)/${Screens.CHANNEL_INFO}`, screen, props);
}

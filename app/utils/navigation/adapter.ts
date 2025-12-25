// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {router} from 'expo-router';
import {DeviceEventEmitter, Keyboard} from 'react-native';

import {Events, Screens} from '@constants';
import {UNAUTHENTICATED_SCREENS, HOME_TAB_SCREENS, SCREENS_AS_BOTTOM_SHEET, MODAL_SCREENS} from '@constants/screens';
import {NavigationStoreV2} from '@store/expo_navigation_store';
import {logError} from '@utils/log';

import type {UserProfileProps} from '@screens/user_profile';
import type {AvailableScreens} from '@typings/screens/navigation';

export function propsToParams(props: any): Record<string, string> {
    return Object.keys(props || {}).reduce((params, key) => {
        params[key] = typeof props[key] === 'string' ? props[key] : JSON.stringify(props[key]);
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
function getExpoRouterPath(screen: AvailableScreens, props?: any): string | undefined {
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
        // Try Expo Router first
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
        // Fall back to RNN if Expo Router not available or route not mapped
        logError('navigateToScreen: Expo Router navigation failed, falling back to RNN', e);
    }
}

export function navigateToScreenWithBaseRoute(baseRoute: string, screen: AvailableScreens, props?: Record<string, unknown>, reset = false) {
    const pathname = `${baseRoute}/${screen}`;
    const params = propsToParams(props);
    if (reset) {
        router.replace({pathname, params});
    } else {
        router.push({pathname, params});
    }
}

export async function navigateBack() {
    try {
        if (router && router.canGoBack()) {
            router.back();
            await new Promise((resolve) => setTimeout(resolve, 250));
        }
    } catch (e) {
        // Ignore
    }
}

export async function dismissCount(count: number) {
    if (router && router.canDismiss()) {
        router.dismiss(count);
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
}

export async function dismissModalScreen() {
    if (router && router.canGoBack()) {
        router.back();
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
}

export async function dismissAllModals() {
    if (router && router.canDismiss()) {
        router.dismissAll();
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
}

export async function dismissBottomSheet() {
    DeviceEventEmitter.emit(Events.CLOSE_BOTTOM_SHEET);
    await NavigationStoreV2.waitUntilScreensIsRemoved(Screens.BOTTOM_SHEET);
    await new Promise((resolve) => setTimeout(resolve, 250));
}

export function popToRoot() {
    try {
        if (router) {
            // Get the root route info from NavigationStore
            const rootRouteInfo = NavigationStoreV2.getRootRouteInfo();

            if (rootRouteInfo) {
                // Use replace to reset the stack to root with original params (no animation)
                router.replace({
                    pathname: rootRouteInfo.pathname,
                    params: rootRouteInfo.params,
                });
            }
        }
    } catch (e) {
        // Ignore - fallback to RNN handled elsewhere
    }
}

export async function dismissAllModalsAndPopToRoot() {
    await dismissAllModals();
    popToRoot();
}

export async function dismissAllModalsAndPopToScreen(screenId: AvailableScreens, passProps = {}) {
    await dismissAllModals();

    try {
        if (router) {
            const route = getExpoRouterPath(screenId);

            if (!route) {
                return;
            }

            const params = propsToParams(passProps);

            if (NavigationStoreV2.isScreenInStack(screenId)) {
                // Screen is in stack - navigate to it (router handles popping back to it)
                router.dismissTo(screenId);
                router.setParams(params);
            } else {
                // Screen not in stack - push new screen
                navigateToScreen(screenId, passProps);
            }
        }
    } catch (e) {
        // Fall back if needed
    }
}

export async function openUserProfileModal(
    props: UserProfileProps,
) {
    const screen = Screens.USER_PROFILE;

    Keyboard.dismiss();
    navigateToScreen(screen, props);
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {router} from 'expo-router';
import {DeviceEventEmitter} from 'react-native';

import {Events, Screens} from '@constants';
import {UNAUTHENTICATED_SCREENS, HOME_TAB_SCREENS, SCREENS_AS_BOTTOM_SHEET, MODAL_SCREENS} from '@constants/screens';
import BottomSheetStore from '@store/bottom_sheet_store';
import {NavigationStore} from '@store/navigation_store';
import {logError} from '@utils/log';

import type {BottomSheetFooterProps} from '@gorhom/bottom-sheet';
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

export async function dismissToStackRoot() {
    if (router && router.canDismiss()) {
        router.dismissAll();
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
}

export function bottomSheet(renderContent: () => React.ReactNode, snapPoints: Array<string | number>, footerComponent?: (props: BottomSheetFooterProps) => React.ReactNode) {
    BottomSheetStore.setSnapPoints(snapPoints);
    BottomSheetStore.setRenderContentCallback(renderContent);
    if (footerComponent) {
        BottomSheetStore.setFooterComponent(footerComponent);
    }

    navigateToScreen(Screens.GENERIC_BOTTOM_SHEET);
}

export async function dismissBottomSheet() {
    if (!NavigationStore.isScreenInStack(Screens.BOTTOM_SHEET)) {
        return;
    }
    DeviceEventEmitter.emit(Events.CLOSE_BOTTOM_SHEET);
    await NavigationStore.waitUntilScreensIsRemoved(Screens.BOTTOM_SHEET);
    BottomSheetStore.reset();
    await new Promise((resolve) => setTimeout(resolve, 250));
}

export async function resetToRootRoute() {
    if (router) {
        // Get the root route info from NavigationStore
        const rootRouteInfo = NavigationStore.getRootRouteInfo();

        if (rootRouteInfo) {
            // Use replace to reset the stack to root with original params
            router.replace({
                pathname: rootRouteInfo.pathname,
                params: rootRouteInfo.params,
            });
        }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
}

export async function dismissAllRoutesAndResetToRootRoute() {
    await dismissToStackRoot();
    await resetToRootRoute();
}

export async function dismissAllRoutesAndPopToScreen(screenId: AvailableScreens, passProps = {}) {
    try {
        if (router) {
            const route = getExpoRouterPath(screenId);

            if (!route) {
                return;
            }

            const params = propsToParams(passProps);

            if (NavigationStore.isScreenInStack(screenId)) {
                // Screen is in stack - navigate to it (router handles popping back to it)
                router.dismissTo(screenId);
                router.setParams(params);
                await new Promise((resolve) => setTimeout(resolve, 250));
            } else {
                // Screen not in stack - push new screen
                await dismissAllRoutesAndResetToRootRoute();
                navigateToScreen(screenId, passProps);
            }
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


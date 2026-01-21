// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject} from 'rxjs';

import type {NavigationState as ExpoNavigationState, NavigationRoute, ParamListBase} from '@react-navigation/native';
import type {AvailableScreens} from '@typings/screens/navigation';

interface NavigationState {
    screenStack: AvailableScreens[];
}

const initialState: NavigationState = {
    screenStack: [],
};

class NavigationStoreSingleton {
    private stateSubject = new BehaviorSubject<NavigationState>(initialState);
    private screenSubject = new BehaviorSubject<AvailableScreens | undefined>(undefined);
    private currentNavigationState: ExpoNavigationState | undefined;
    private tosOpen = false;

    // Observable access
    state$ = this.stateSubject.asObservable();
    currentScreen$ = this.screenSubject.asObservable();

    // Getters
    get state() {
        return this.stateSubject.value;
    }

    getVisibleScreen() {
        return this.state.screenStack[this.state.screenStack.length - 1];
    }

    getScreensInStack() {
        return this.state.screenStack;
    }

    isScreenInStack(screenId: AvailableScreens) {
        return this.state.screenStack.includes(screenId);
    }

    isModalOpen(): boolean {
        return this.state.screenStack.includes('(modals)');
    }

    getRootRouteInfo(): {pathname: string; params?: Record<string, string>} | undefined {
        if (!this.currentNavigationState) {
            return undefined;
        }

        // Get the root route (first route in the navigation state)
        const rootRoute = this.currentNavigationState.routes[0];
        if (!rootRoute) {
            return undefined;
        }

        // Build the pathname by traversing nested routes
        const pathname = this.buildPathname(rootRoute);

        // Extract params from the root route
        const params = rootRoute.params as Record<string, string> | undefined;

        return {pathname, params};
    }

    // State management
    reset() {
        this.stateSubject.next(initialState);
        this.screenSubject.next(undefined);
        this.currentNavigationState = undefined;
        this.tosOpen = false;
    }

    updateFromNavigationState(navState: ExpoNavigationState | undefined) {
        if (!navState) {
            return;
        }

        // Store the current navigation state for getRootRouteInfo
        this.currentNavigationState = navState;

        // Update screenStack with current screens
        const screenStack: AvailableScreens[] = [];
        this.extractScreenIds(navState, screenStack);

        // Update the state if the screen stack has changed
        const stackChanged = screenStack.length !== this.state.screenStack.length ||
            screenStack.some((screen, index) => screen !== this.state.screenStack[index]);

        if (stackChanged) {
            // Get the visible screen before updating state
            const visibleScreen = screenStack[screenStack.length - 1];
            const prevVisibleScreen = this.state.screenStack[this.state.screenStack.length - 1];

            // Update the state
            this.stateSubject.next({...this.state, screenStack});

            // Update the current screen if it changed
            if (visibleScreen !== prevVisibleScreen) {
                this.screenSubject.next(visibleScreen);
            }
        }
    }

    // Async wait utilities
    waitUntilScreenHasLoaded(screenId: AvailableScreens): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this.isScreenInStack(screenId)) {
                resolve();
                return;
            }

            const subscription = this.state$.subscribe((state) => {
                if (state.screenStack.includes(screenId)) {
                    subscription.unsubscribe();
                    resolve();
                }
            });

            setTimeout(() => {
                subscription.unsubscribe();
                resolve();
            }, 30000);
        });
    }

    waitUntilScreenIsTop(screenId: AvailableScreens): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this.getVisibleScreen() === screenId) {
                resolve();
                return;
            }

            const subscription = this.state$.subscribe((state) => {
                const topScreen = state.screenStack[state.screenStack.length - 1];
                if (topScreen === screenId) {
                    subscription.unsubscribe();
                    resolve();
                }
            });

            setTimeout(() => {
                subscription.unsubscribe();
                resolve();
            }, 30000);
        });
    }

    waitUntilScreensIsRemoved(screenId: AvailableScreens): Promise<void> {
        return new Promise<void>((resolve) => {
            if (!this.isScreenInStack(screenId)) {
                resolve();
                return;
            }

            const subscription = this.state$.subscribe((state) => {
                if (!state.screenStack.includes(screenId)) {
                    subscription.unsubscribe();
                    resolve();
                }
            });

            setTimeout(() => {
                subscription.unsubscribe();
                resolve();
            }, 30000);
        });
    }

    // Terms of Service state
    isToSOpen(): boolean {
        return this.tosOpen;
    }

    setToSOpen(open: boolean) {
        this.tosOpen = open;
    }

    // Private methods
    private buildPathname(route: ExpoNavigationState['routes'][0]): string {
        // Start with the route name
        let pathname = `/${route.name}`;

        // If there's a nested state, traverse to the deepest active route
        const routeState = (route as {state?: ExpoNavigationState}).state;
        if (routeState) {
            const activeIndex = routeState.index ?? 0;
            const activeRoute = routeState.routes[activeIndex];

            if (activeRoute) {
                // Append the nested route path
                const nestedPath = this.buildPathname(activeRoute);
                pathname += nestedPath;
            }
        }

        return pathname;
    }

    private extractScreenIds(state: ExpoNavigationState, screenStack: AvailableScreens[]) {
        if (!state) {
            return;
        }

        const routes = state.routes || [];
        const currentIndex = state.index ?? 0;

        // Check if this is a tab navigator
        const isTabNavigator = state.type === 'tab';

        if (isTabNavigator) {
            // For Tab navigators: only process the active tab
            const currentRoute = routes[currentIndex];
            if (currentRoute) {
                const currentScreenId = this.getScreenIdFromRouteKey(currentRoute.key);
                if (currentScreenId && !screenStack.includes(currentScreenId)) {
                    screenStack.push(currentScreenId);
                }

                // Recurse into the active tab's state
                if (currentRoute.state) {
                    this.extractScreenIds(currentRoute.state as ExpoNavigationState, screenStack);
                }
            }
        } else {
            // For Stack navigators: process ALL routes in order
            // This captures the full stack including screens underneath overlays
            routes.forEach((route: NavigationRoute<ParamListBase, string>) => {
                const screenId = this.getScreenIdFromRouteKey(route.key);
                if (screenId && !screenStack.includes(screenId)) {
                    screenStack.push(screenId);
                }

                // Recurse into each route's nested state to capture the full hierarchy
                // For non-current routes, this captures underlying screens when overlays are present
                // For the current route, this captures the deepest active screens
                if (route.state) {
                    this.extractScreenIds(route.state as ExpoNavigationState, screenStack);
                }
            });
        }
    }

    private getScreenIdFromRouteKey(routeKey: string): AvailableScreens | undefined {
        // Route keys in Expo Router are like "(channel_info)/channel_notifications-abc123"
        // or "(channel_info)/index-abc123" or "channel-def456"
        // Extract the route name part before the dash
        const fullPath = routeKey.split('-')[0];

        // Split by slash to get path segments
        const segments = fullPath.split('/').filter(Boolean);

        if (segments.length === 0) {
            return undefined;
        }

        // Get the last segment
        const lastSegment = segments[segments.length - 1];

        // If the last segment is 'index', return the parent directory name
        if (lastSegment === 'index' && segments.length > 1) {
            const parentSegment = segments[segments.length - 2];

            return parentSegment as AvailableScreens;
        }

        // Otherwise return the last segment
        return lastSegment as AvailableScreens;
    }
}

// Export singleton
export const NavigationStore = new NavigationStoreSingleton();

// React hooks
export function useCurrentScreen(): AvailableScreens | undefined {
    const [screen, setScreen] = useState<AvailableScreens | undefined>(() => NavigationStore.getVisibleScreen());

    useEffect(() => {
        const subscription = NavigationStore.currentScreen$.subscribe(setScreen);
        return () => subscription.unsubscribe();
    }, []);

    return screen;
}

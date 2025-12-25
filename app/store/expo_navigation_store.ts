// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject, Subject} from 'rxjs';

import type {NavigationState as ExpoNavigationState, NavigationRoute, ParamListBase} from '@react-navigation/native';
import type {AvailableScreens} from '@typings/screens/navigation';

export enum ScreenType {
    Screen = 'screen',
    Modal = 'modal',
    Tab = 'tab',
}

export interface ScreenEvent {
    type: 'added' | 'removed';
    screenId: AvailableScreens;
    screenType: ScreenType;
    timestamp: number;
}

interface NavigationState {
    screenStack: AvailableScreens[];
    modalStack: AvailableScreens[];
    visibleTab: string;
}

const initialState: NavigationState = {
    screenStack: [],
    modalStack: [],
    visibleTab: '',
};

class NavigationStoreV2Singleton {
    private stateSubject = new BehaviorSubject<NavigationState>(initialState);
    private screenSubject = new BehaviorSubject<AvailableScreens | undefined>(undefined);
    private screenEventsSubject = new Subject<ScreenEvent>();
    private previousRouteKeys = new Set<string>();
    private previousStateKey: string | undefined;
    private currentNavigationState: ExpoNavigationState | undefined;

    // Observable access
    state$ = this.stateSubject.asObservable();
    currentScreen$ = this.screenSubject.asObservable();
    screenEvents$ = this.screenEventsSubject.asObservable();

    // Getters (singleton access from actions)
    get state() {
        return this.stateSubject.value;
    }

    getVisibleScreen() {
        return this.state.screenStack[0];
    }

    getScreensInStack() {
        return this.state.screenStack;
    }

    hasModalsOpened() {
        return this.state.modalStack.length > 0;
    }

    isScreenInStack(screenId: AvailableScreens) {
        return this.state.screenStack.includes(screenId);
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

    // Mutations
    addScreenToStack(screen: AvailableScreens) {
        const newStack = [screen, ...this.state.screenStack];
        this.stateSubject.next({...this.state, screenStack: newStack});
        this.screenSubject.next(screen);
    }

    removeScreenFromStack(screen: AvailableScreens) {
        const newStack = this.state.screenStack.filter((s) => s !== screen);
        this.stateSubject.next({...this.state, screenStack: newStack});
        const visible = newStack[0];
        if (visible) {
            this.screenSubject.next(visible);
        }
    }

    addModalToStack(modal: AvailableScreens) {
        const newStack = [modal, ...this.state.modalStack];
        this.stateSubject.next({...this.state, modalStack: newStack});
    }

    removeModalFromStack(modal: AvailableScreens) {
        const newStack = this.state.modalStack.filter((m) => m !== modal);
        this.stateSubject.next({...this.state, modalStack: newStack});
    }

    reset() {
        this.stateSubject.next(initialState);
        this.screenSubject.next(undefined);
        this.previousRouteKeys.clear();
        this.previousStateKey = undefined;
    }

    // Update navigation state from Expo Router navigation events
    updateFromNavigationState(navState: ExpoNavigationState | undefined) {
        if (!navState) {
            return;
        }

        // Store the current navigation state for getRootRouteInfo
        this.currentNavigationState = navState;

        // Check if root state was replaced (e.g., unauthenticated -> authenticated)
        const stateKey = navState.key;
        if (this.previousStateKey && this.previousStateKey !== stateKey) {
            // Root state replaced - emit removed events for all previous screens
            this.previousRouteKeys.forEach((routeKey) => {
                const screenId = this.getScreenIdFromRouteKey(routeKey);
                if (screenId) {
                    this.screenEventsSubject.next({
                        type: 'removed',
                        screenId,
                        screenType: this.getScreenType(navState),
                        timestamp: Date.now(),
                    });
                }
            });
            this.previousRouteKeys.clear();
        }
        this.previousStateKey = stateKey;

        // Extract all current routes
        const currentRouteKeys = new Set<string>();
        this.extractRouteKeys(navState, currentRouteKeys);

        // Determine added routes
        currentRouteKeys.forEach((routeKey) => {
            if (!this.previousRouteKeys.has(routeKey)) {
                const screenId = this.getScreenIdFromRouteKey(routeKey);
                if (screenId) {
                    this.screenEventsSubject.next({
                        type: 'added',
                        screenId,
                        screenType: this.getScreenType(navState),
                        timestamp: Date.now(),
                    });
                }
            }
        });

        // Determine removed routes
        this.previousRouteKeys.forEach((routeKey) => {
            if (!currentRouteKeys.has(routeKey)) {
                const screenId = this.getScreenIdFromRouteKey(routeKey);
                if (screenId) {
                    this.screenEventsSubject.next({
                        type: 'removed',
                        screenId,
                        screenType: this.getScreenType(navState),
                        timestamp: Date.now(),
                    });
                }
            }
        });

        // Update previous routes
        this.previousRouteKeys = currentRouteKeys;

        // Update screenStack with current screens
        const screenStack: AvailableScreens[] = [];
        this.extractScreenIds(navState, screenStack);

        // Update the visible screen (top of the stack)
        const visibleScreen = screenStack[0];
        if (visibleScreen !== this.state.screenStack[0]) {
            this.stateSubject.next({...this.state, screenStack});
            if (visibleScreen) {
                this.screenSubject.next(visibleScreen);
            }
        }
    }

    private extractRouteKeys(state: ExpoNavigationState, routeKeys: Set<string>) {
        if (state.routes) {
            state.routes.forEach((route) => {
                if (route.key) {
                    routeKeys.add(route.key);
                }
                if (route.state) {
                    this.extractRouteKeys(route.state as ExpoNavigationState, routeKeys);
                }
            });
        }
    }

    private extractScreenIds(state: ExpoNavigationState, screenStack: AvailableScreens[]) {
        if (!state) {
            return;
        }

        const routes = state.routes || [];
        const currentIndex = state.index ?? 0;

        // Process all routes in this level (for stacks, we want all screens in the stack)
        routes.forEach((route: NavigationRoute<ParamListBase, string>, index: number) => {
            const screenId = this.getScreenIdFromRouteKey(route.key);
            if (screenId && !screenStack.includes(screenId)) {
                // If this is the current/visible route at this level, add it to the front
                // Otherwise add it to the back
                if (index === currentIndex) {
                    screenStack.unshift(screenId);
                } else {
                    screenStack.push(screenId);
                }
            }

            // Recursively process nested routes (only for the current route to get the deepest active screen)
            if (route.state && index === currentIndex) {
                this.extractScreenIds(route.state as ExpoNavigationState, screenStack);
            }
        });
    }

    private getScreenIdFromRouteKey(routeKey: string): AvailableScreens | undefined {
        // Route keys are like "onboarding-abc123" or "channel_list-def456"
        // Extract the route name part before the dash (which matches our screen constants)
        const routeName = routeKey.split('-')[0];
        return routeName as AvailableScreens;
    }

    private getScreenType(state: ExpoNavigationState): ScreenType {
        // Determine screen type based on navigation state structure
        // Modal: presentation mode is 'modal'
        // Tab: type is 'tab'
        // Screen: default
        if (state.type === 'tab') {
            return ScreenType.Tab;
        }

        // Check if any route has modal presentation
        const hasModal = state.routes?.some((route) => {
            const routeParams = route.params as Record<string, unknown> | undefined;
            return routeParams?.presentation === 'modal';
        });

        if (hasModal) {
            return ScreenType.Modal;
        }

        return ScreenType.Screen;
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
                if (state.screenStack[0] === screenId) {
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
}

// Export singleton
export const NavigationStoreV2 = new NavigationStoreV2Singleton();

// React hooks
export function useNavigationStore(): NavigationState {
    const [state, setState] = useState<NavigationState>(NavigationStoreV2.state);

    useEffect(() => {
        const subscription = NavigationStoreV2.state$.subscribe(setState);
        return () => subscription.unsubscribe();
    }, []);

    return state;
}

export function useCurrentScreen(): AvailableScreens | undefined {
    const [screen, setScreen] = useState<AvailableScreens | undefined>(
        NavigationStoreV2.getVisibleScreen(),
    );

    useEffect(() => {
        const subscription = NavigationStoreV2.currentScreen$.subscribe(setScreen);
        return () => subscription.unsubscribe();
    }, []);

    return screen;
}

export function useScreenEvents(callback: (event: ScreenEvent) => void) {
    useEffect(() => {
        const subscription = NavigationStoreV2.screenEvents$.subscribe(callback);
        return () => subscription.unsubscribe();
    }, [callback]);
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigationState, type NavigationState, type PartialState} from '@react-navigation/native';
import {Tabs, useNavigation} from 'expo-router';
import {NativeTabs} from 'expo-router/unstable-native-tabs';
import React, {useEffect, useMemo, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {DeviceEventEmitter, type ImageSourcePropType} from 'react-native';

import CompassIcon, {type CompassIconName} from '@components/compass_icon';
import {Events, Navigation as NavigationConstants, Screens} from '@constants';
import {HIDDEN_SCROLL_EDGE_EFFECTS, isPlatformUiIos} from '@constants/platform_ui';
import {HOME_CHANNEL_LIST_SCREENS} from '@constants/screens';
import {BOTTOM_TAB_ICON_SIZE} from '@constants/view';
import {useTheme} from '@context/theme';
import TabBar from '@screens/home/tab_bar';
import {blendColors, getChromeMaterialBlurEffect, getColorSchemeForBackground, makeStyleSheetFromTheme} from '@utils/theme';

const tabMessages = defineMessages({
    home: {
        id: 'mobile.tabs.home',
        defaultMessage: 'Home',
    },
    mentions: {
        id: 'mobile.tabs.mentions',
        defaultMessage: 'Mentions',
    },
    saved: {
        id: 'mobile.tabs.saved',
        defaultMessage: 'Saved',
    },
    profile: {
        id: 'mobile.tabs.profile',
        defaultMessage: 'Profile',
    },
    search: {
        id: 'mobile.tabs.search',
        defaultMessage: 'Search',
    },
});

const NATIVE_TAB_IDLE_ICON_OPACITY = 0.64;
const NATIVE_TAB_IDLE_LABEL_OPACITY = 0.72;

type NativeTabInterfaceStyle = 'light' | 'dark';

function findRouteByName(
    state: NavigationState | PartialState<NavigationState> | undefined,
    name: string,
): {name: string; state?: NavigationState | PartialState<NavigationState>} | undefined {
    if (!state?.routes) {
        return undefined;
    }

    for (const route of state.routes) {
        if (route.name === name) {
            return route;
        }
        const nested = findRouteByName(route.state, name);
        if (nested) {
            return nested;
        }
    }

    return undefined;
}

function findNativeTabState(
    state: NavigationState | PartialState<NavigationState> | undefined,
): NavigationState | PartialState<NavigationState> | undefined {
    if (!state?.routes) {
        return undefined;
    }

    const names = new Set(state.routes.map((route) => route.name));
    if (names.has(Screens.CHANNEL_LIST) && names.has(Screens.MENTIONS)) {
        return state;
    }

    for (const route of state.routes) {
        const nested = findNativeTabState(route.state);
        if (nested) {
            return nested;
        }
    }

    return undefined;
}

function interfaceStyleForBackground(background: string): NativeTabInterfaceStyle {
    return getColorSchemeForBackground(background);
}

function getNativeTabIcon(name: CompassIconName, color: string): ImageSourcePropType | undefined {
    // Typed as ImageResult, but guard in case the native module is unavailable.
    const source = CompassIcon.getImageSourceSync(name, BOTTOM_TAB_ICON_SIZE, color) as ImageSourcePropType | null;
    if (!source) {
        if (__DEV__) {
            throw new Error(`Failed to load native tab icon: ${name}`);
        }
        return undefined;
    }
    return source;
}

function getNativeTabIconPair(name: CompassIconName, idleColor: string, selectedColor: string): {default: ImageSourcePropType; selected: ImageSourcePropType} | undefined {
    const defaultIcon = getNativeTabIcon(name, idleColor);
    const selectedIcon = getNativeTabIcon(name, selectedColor);
    if (!defaultIcon || !selectedIcon) {
        return undefined;
    }
    return {default: defaultIcon, selected: selectedIcon};
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    card: {
        backgroundColor: theme.centerChannelBg,
    },
}));

function useTabNavigationListeners() {
    const navigation = useNavigation();

    useEffect(() => {
        const homeListener = DeviceEventEmitter.addListener(NavigationConstants.NAVIGATION_HOME, () => {
            // @ts-expect-error dynamic tab route
            navigation.navigate(Screens.CHANNEL_LIST);
        });

        const tabListener = DeviceEventEmitter.addListener(
            NavigationConstants.NAVIGATE_TO_TAB,
            ({screen, params = {}}: {screen: string; params?: Record<string, unknown>}) => {
                // @ts-expect-error dynamic tab route
                navigation.navigate(screen, params);
            },
        );

        return () => {
            homeListener.remove();
            tabListener.remove();
        };
    }, [navigation]);
}

function useIsHomeTabSidebarChrome() {
    // Prefer tab navigator state over URL segments — NativeTabs can omit channel_list from
    // segments, which left idle icons stuck on sheet colors over the sidebar Home tab.
    return useNavigationState((state) => {
        const tabState = findNativeTabState(state);
        if (!tabState) {
            return true;
        }

        const focusedTab = tabState.routes?.[tabState.index ?? 0]?.name;
        if (focusedTab !== Screens.CHANNEL_LIST) {
            return false;
        }

        const homeRoute = findRouteByName(state, Screens.CHANNEL_LIST);
        const stackState = homeRoute?.state;
        if (!stackState?.routes?.length) {
            return true;
        }

        const focusedName = stackState.routes[stackState.index ?? 0]?.name;
        return !(focusedName && HOME_CHANNEL_LIST_SCREENS.has(focusedName));
    });
}

function NativeTabLayout() {
    const theme = useTheme();
    const intl = useIntl();
    const [hidden, setHidden] = useState(false);
    const onSidebarChrome = useIsHomeTabSidebarChrome();

    useTabNavigationListeners();

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.TAB_BAR_VISIBLE, (show: boolean) => {
            setHidden(!show);
        });
        return () => listener.remove();
    }, []);

    const chromeBackdrop = onSidebarChrome ? theme.sidebarBg : theme.centerChannelBg;
    const chromeInterfaceStyle = interfaceStyleForBackground(chromeBackdrop);
    const tabBlurEffect = getChromeMaterialBlurEffect(chromeBackdrop);

    // UITabBar title colors ignore alpha; Liquid Glass also fights translucent tints.
    // Bake idle opacity into opaque colors for both labels and original-mode icons.
    const idleIconColor = blendColors(
        chromeBackdrop,
        onSidebarChrome ? theme.sidebarHeaderTextColor : theme.centerChannelColor,
        NATIVE_TAB_IDLE_ICON_OPACITY,
        true,
    );
    const idleLabelColor = blendColors(
        chromeBackdrop,
        onSidebarChrome ? theme.sidebarHeaderTextColor : theme.centerChannelColor,
        NATIVE_TAB_IDLE_LABEL_OPACITY,
        true,
    );

    // Active tab uses the full foreground color (100% opacity) for the current background context,
    // matching the same bg/fg pair as the idle blend but without any opacity reduction.
    const selectedColor = onSidebarChrome ? theme.sidebarHeaderTextColor : theme.centerChannelColor;
    const tabNativeProps = useMemo(() => ({
        scrollEdgeEffects: HIDDEN_SCROLL_EDGE_EFFECTS,
        experimental_userInterfaceStyle: chromeInterfaceStyle,
    }), [chromeInterfaceStyle]);

    const homeContentStyle = useMemo(() => ({backgroundColor: theme.sidebarBg}), [theme.sidebarBg]);

    const labelStyle = useMemo(() => ({
        default: {
            color: idleLabelColor,
            fontFamily: 'OpenSans-SemiBold',
            fontSize: 11,
            fontWeight: '600' as const,
        },
        selected: {
            color: selectedColor,
            fontFamily: 'OpenSans-SemiBold',
            fontSize: 11,
            fontWeight: '600' as const,
        },
    }), [idleLabelColor, selectedColor]);

    // Bake colors into icon images using original rendering mode — Liquid Glass cannot
    // recolor original-mode images, unlike template mode which it overrides.
    // Re-key when backdrop or baked colors change so UITabBarItem picks up custom theme updates.
    const chromeKey = `${onSidebarChrome ? 'sidebar' : 'sheet'}-${chromeInterfaceStyle}-${idleIconColor}-${selectedColor}`;
    const icons = useMemo(() => ({
        home: getNativeTabIconPair('home-variant-outline', idleIconColor, selectedColor),
        mentions: getNativeTabIconPair('at', idleIconColor, selectedColor),
        saved: getNativeTabIconPair('bookmark-outline', idleIconColor, selectedColor),
        account: getNativeTabIconPair('account-outline', idleIconColor, selectedColor),
        search: getNativeTabIconPair('magnify', idleIconColor, selectedColor),
    }), [idleIconColor, selectedColor]);

    return (
        <NativeTabs
            blurEffect={tabBlurEffect}
            disableTransparentOnScrollEdge={true}
            hidden={hidden}
            labelStyle={labelStyle}
            tintColor={selectedColor}

            // iOS 26 Liquid Glass often clamps title offsets; keep a modest gap only.
            titlePositionAdjustment={{vertical: 12}}
        >
            <NativeTabs.Trigger
                name={Screens.CHANNEL_LIST}
                contentStyle={homeContentStyle}
                disableAutomaticContentInsets={true}
                disableTransparentOnScrollEdge={true}
                unstable_nativeProps={tabNativeProps}
            >
                <NativeTabs.Trigger.Label>{intl.formatMessage(tabMessages.home)}</NativeTabs.Trigger.Label>
                {icons.home && (
                    <NativeTabs.Trigger.Icon
                        key={chromeKey}
                        src={icons.home}
                        renderingMode='original'
                    />
                )}
            </NativeTabs.Trigger>
            <NativeTabs.Trigger
                name={Screens.MENTIONS}
                contentStyle={homeContentStyle}
                disableAutomaticContentInsets={true}
                disableTransparentOnScrollEdge={true}
                unstable_nativeProps={tabNativeProps}
            >
                <NativeTabs.Trigger.Label>{intl.formatMessage(tabMessages.mentions)}</NativeTabs.Trigger.Label>
                {icons.mentions && (
                    <NativeTabs.Trigger.Icon
                        key={chromeKey}
                        src={icons.mentions}
                        renderingMode='original'
                    />
                )}
            </NativeTabs.Trigger>
            <NativeTabs.Trigger
                name={Screens.SAVED_MESSAGES}
                contentStyle={homeContentStyle}
                disableAutomaticContentInsets={true}
                unstable_nativeProps={tabNativeProps}
            >
                <NativeTabs.Trigger.Label>{intl.formatMessage(tabMessages.saved)}</NativeTabs.Trigger.Label>
                {icons.saved && (
                    <NativeTabs.Trigger.Icon
                        key={chromeKey}
                        src={icons.saved}
                        renderingMode='original'
                    />
                )}
            </NativeTabs.Trigger>
            <NativeTabs.Trigger
                name={Screens.ACCOUNT}
                contentStyle={homeContentStyle}
                disableAutomaticContentInsets={true}
                unstable_nativeProps={tabNativeProps}
            >
                <NativeTabs.Trigger.Label>{intl.formatMessage(tabMessages.profile)}</NativeTabs.Trigger.Label>
                {icons.account && (
                    <NativeTabs.Trigger.Icon
                        key={chromeKey}
                        src={icons.account}
                        renderingMode='original'
                    />
                )}
            </NativeTabs.Trigger>
            <NativeTabs.Trigger
                name={Screens.SEARCH}
                role='search'
                contentStyle={homeContentStyle}
                disableAutomaticContentInsets={true}
                unstable_nativeProps={tabNativeProps}
            >
                <NativeTabs.Trigger.Label>{intl.formatMessage(tabMessages.search)}</NativeTabs.Trigger.Label>
                {icons.search && (
                    <NativeTabs.Trigger.Icon
                        key={chromeKey}
                        src={icons.search}
                        renderingMode='original'
                    />
                )}
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}

function JavaScriptTabLayout() {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                lazy: true,
                sceneStyle: styles.card,
            }}
            backBehavior='none'
            tabBar={(props) => (
                <TabBar
                    {...props}
                    theme={theme}
                />
            )}
        >
            <Tabs.Screen
                name={Screens.CHANNEL_LIST}
                options={{
                    title: 'Home',
                    href: '/(authenticated)/(home)',
                    tabBarButtonTestID: 'tab_bar.home.tab',
                    freezeOnBlur: false,
                    animation: 'none',
                }}
            />
            <Tabs.Screen
                name={Screens.SEARCH}
                options={{
                    title: 'Search',
                    href: null,
                    tabBarButtonTestID: 'tab_bar.search.tab',
                    freezeOnBlur: true,
                }}
            />
            <Tabs.Screen
                name={Screens.MENTIONS}
                options={{
                    title: 'Mentions',
                    href: null,
                    tabBarButtonTestID: 'tab_bar.mentions.tab',
                    freezeOnBlur: true,
                }}
            />
            <Tabs.Screen
                name={Screens.SAVED_MESSAGES}
                options={{
                    title: 'Saved',
                    href: null,
                    tabBarButtonTestID: 'tab_bar.saved_messages.tab',
                    freezeOnBlur: true,
                }}
            />
            <Tabs.Screen
                name={Screens.ACCOUNT}
                options={{
                    title: 'Account',
                    href: null,
                    tabBarButtonTestID: 'tab_bar.account.tab',
                    freezeOnBlur: true,
                }}
            />
        </Tabs>
    );
}

export default function TabLayout() {
    if (isPlatformUiIos()) {
        return <NativeTabLayout/>;
    }

    return <JavaScriptTabLayout/>;
}

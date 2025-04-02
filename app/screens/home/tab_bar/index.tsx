// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {DeviceEventEmitter, View, TouchableOpacity} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Shadow} from 'react-native-shadow-2';

import {Events, Navigation as NavigationConstants, Screens, View as ViewConstants} from '@constants';
import {useWindowDimensions} from '@hooks/device';
import NavigationStore from '@store/navigation_store';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Account from './account';
import Home from './home';
import Mentions from './mentions';
import SavedMessages from './saved_messages';
import Search from './search';

import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.centerChannelBg,
        alignContent: 'center',
        flexDirection: 'row',
        height: ViewConstants.BOTTOM_TAB_HEIGHT,
        justifyContent: 'center',
    },
    item: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    separator: {
        borderTopColor: changeOpacity(theme.centerChannelColor, 0.08),
        borderTopWidth: 0.5,
    },
    slider: {
        backgroundColor: theme.buttonBg,
        borderBottomLeftRadius: 4,
        borderBottomRightRadius: 4,
        width: 48,
        height: 4,
    },
    sliderContainer: {
        height: 4,
        position: 'absolute',
        top: 0,
        left: 10,
        alignItems: 'center',
    },
    shadowBorder: {
        borderRadius: 6,
    },
}));

const shadowSides = {top: true, bottom: false, end: false, start: false};
const shadowOffset: [x: number | string, y: number | string] = [0, -0.5];

const TabComponents: Record<string, any> = {
    Account,
    Home,
    Mentions,
    SavedMessages,
    Search,
};

function TabBar({state, descriptors, navigation, theme}: BottomTabBarProps & {theme: Theme}) {
    const [visible, setVisible] = useState<boolean|undefined>();
    const {width} = useWindowDimensions();
    const tabWidth = width / state.routes.length;
    const style = getStyleSheet(theme);
    const safeareaInsets = useSafeAreaInsets();

    useEffect(() => {
        const event = DeviceEventEmitter.addListener(Events.TAB_BAR_VISIBLE, (show) => {
            setVisible(show);
        });

        return () => event.remove();
    }, []);

    useEffect(() => {
        const listner = DeviceEventEmitter.addListener(NavigationConstants.NAVIGATION_HOME, () => {
            NavigationStore.setVisibleTap(Screens.HOME);
            navigation.navigate(Screens.HOME);
        });

        return () => listner.remove();
    });

    useEffect(() => {
        const listner = DeviceEventEmitter.addListener(NavigationConstants.NAVIGATE_TO_TAB, ({screen, params = {}}: {screen: string; params: any}) => {
            const lastTab = state.history[state.history.length - 1];
            // eslint-disable-next-line max-nested-callbacks
            const routeIndex = state.routes.findIndex((r) => r.name === screen);
            const route = state.routes[routeIndex];
            // eslint-disable-next-line max-nested-callbacks
            const lastIndex = state.routes.findIndex((r) => r.key === lastTab.key);
            const direction = lastIndex < routeIndex ? 'right' : 'left';
            const event = navigation.emit({
                type: 'tabPress',
                target: screen,
                canPreventDefault: true,
            });

            if (!event.defaultPrevented) {
                // The `merge: true` option makes sure that the params inside the tab screen are preserved
                navigation.navigate({params: {direction, ...params}, name: route.name, merge: false});
                NavigationStore.setVisibleTap(route.name);
            }
        });

        return () => listner.remove();
    }, [state]);

    const transform = useAnimatedStyle(() => {
        const translateX = withTiming(state.index * tabWidth, {duration: 150});
        return {
            transform: [{translateX}],
        };
    }, [state.index, tabWidth]);

    const animatedStyle = useAnimatedStyle(() => {
        if (visible === undefined) {
            return {transform: [{translateY: -safeareaInsets.bottom}]};
        }

        const height = visible ? withTiming(-safeareaInsets.bottom, {duration: 200}) : withTiming(52 + safeareaInsets.bottom, {duration: 150});
        return {
            transform: [{translateY: height}],
        };
    }, [visible, safeareaInsets.bottom]);

    return (
        <Animated.View style={[style.container, style.separator, animatedStyle]}>
            <Shadow
                startColor='rgba(61, 60, 64, 0.08)'
                distance={4}
                offset={shadowOffset}
                style={{
                    position: 'absolute',
                    borderRadius: 6,
                    width,
                }}
                sides={shadowSides}
            />
            <Animated.View
                style={[
                    style.sliderContainer,
                    {width: tabWidth - 20},
                    transform,
                ]}
            >
                <View style={style.slider}/>
            </Animated.View>
            {state.routes.map((route, index) => {
                const {options} = descriptors[route.key];

                const isFocused = state.index === index;

                const onPress = () => {
                    const lastTab = state.history[state.history.length - 1];
                    const lastIndex = state.routes.findIndex((r) => r.key === lastTab.key);
                    const direction = lastIndex < index ? 'right' : 'left';
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });
                    DeviceEventEmitter.emit('tabPress');
                    if (!isFocused && !event.defaultPrevented) {
                        // The `merge: true` option makes sure that the params inside the tab screen are preserved
                        navigation.navigate({params: {direction}, name: route.name, merge: false});
                        NavigationStore.setVisibleTap(route.name);
                    }
                };

                const onLongPress = () => {
                    navigation.emit({
                        type: 'tabLongPress',
                        target: route.key,
                    });
                };

                const renderOption = () => {
                    const Component = TabComponents[route.name];
                    const props = {isFocused, theme};
                    if (Component) {
                        return <Component {...props}/>;
                    }

                    return null;
                };

                return (
                    <TouchableOpacity
                        key={route.name}
                        accessibilityRole='button'
                        accessibilityState={isFocused ? {selected: true} : {}}
                        accessibilityLabel={options.tabBarAccessibilityLabel}
                        testID={options.tabBarButtonTestID}
                        onPress={onPress}
                        onLongPress={onLongPress}
                        style={style.item}
                    >
                        {renderOption()}
                    </TouchableOpacity>
                );
            })}
        </Animated.View>
    );
}

export default TabBar;

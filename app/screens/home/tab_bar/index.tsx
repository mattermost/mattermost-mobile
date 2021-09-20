// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {DeviceEventEmitter, View, TouchableOpacity, useWindowDimensions} from 'react-native';
import {Shadow} from 'react-native-neomorph-shadows';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Account from './account';
import Home from './home';
import Mentions from './mentions';
import Search from './search';

import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.centerChannelBg,
        alignContent: 'center',
        flexDirection: 'row',
        height: 52,
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
}));

const TabComponents: Record<string, any> = {
    Account,
    Home,
    Mentions,
    Search,
};

function TabBar({state, descriptors, navigation, theme}: BottomTabBarProps & {theme: Theme}) {
    const [visible, setVisible] = useState<boolean|undefined>();
    const {width} = useWindowDimensions();
    const tabWidth = width / state.routes.length;
    const style = getStyleSheet(theme);
    const safeareaInsets = useSafeAreaInsets();

    useEffect(() => {
        const event = DeviceEventEmitter.addListener('tabBarVisible', (show) => {
            setVisible(show);
        });

        return () => event.remove();
    }, []);

    const transform = useAnimatedStyle(() => {
        const translateX = withTiming(state.index * tabWidth, {duration: 150});
        return {
            transform: [{translateX}],
        };
    }, [state.index]);

    const animatedStyle = useAnimatedStyle(() => {
        if (visible === undefined) {
            return {transform: [{translateY: -safeareaInsets.bottom}]};
        }

        const height = visible ? withTiming(-safeareaInsets.bottom, {duration: 200}) : withTiming(52 + safeareaInsets.bottom, {duration: 150});
        return {
            transform: [{translateY: height}],
        };
    }, [visible]);

    return (
        <Animated.View style={[style.container, style.separator, animatedStyle]}>
            <Shadow
                style={{
                    position: 'absolute',
                    height: 90,
                    width,
                    shadowColor: 'rgba(61, 60, 64, 0.08)',
                    shadowOffset: {width: 0, height: -0.5},
                    shadowOpacity: 1,
                    shadowRadius: 6,
                    backgroundColor: theme.centerChannelBg,
                }}
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

                    if (!isFocused && !event.defaultPrevented) {
                        // The `merge: true` option makes sure that the params inside the tab screen are preserved
                        navigation.navigate({params: {...route.params, direction}, name: route.name, merge: true});
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
                        testID={options.tabBarTestID}
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

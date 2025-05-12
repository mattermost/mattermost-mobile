// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {Keyboard, Platform} from 'react-native';
import Animated, {KeyboardState, useAnimatedKeyboard, useAnimatedStyle, useDerivedValue, withTiming} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Screens} from '@constants';
import {useIsTablet} from '@hooks/device';
import NavigationStore from '@store/navigation_store';
import {preventDoubleTap} from '@utils/tap';

import type {AvailableScreens} from '@typings/screens/navigation';

export type ExtraKeyboardContextProps = {
    isExtraKeyboardVisible: boolean;
    component: React.ReactElement|null;
    showExtraKeyboard: (component: React.ReactElement|null) => void;
    hideExtraKeyboard: () => void;
    registerTextInputFocus: () => void;
    registerTextInputBlur: () => void;
};

// This is based on the size of the tab bar
const KEYBOARD_OFFSET = -77;

export const ExtraKeyboardContext = createContext<ExtraKeyboardContextProps|undefined>(undefined);

const useOffetForCurrentScreen = (): number => {
    const [screen, setScreen] = useState<AvailableScreens|undefined>();
    const [offset, setOffset] = useState(0);
    const isTablet = useIsTablet();

    useEffect(() => {
        const sub = NavigationStore.getSubject();
        const s = sub.subscribe(setScreen);

        return () => s.unsubscribe();
    }, []);

    useEffect(() => {
        if (isTablet && screen === Screens.HOME) {
            setOffset(KEYBOARD_OFFSET);
        }
    }, [isTablet, screen]);

    return offset;
};

export const ExtraKeyboardProvider = (({children}: {children: React.ReactElement|React.ReactElement[]}) => {
    const [isExtraKeyboardVisible, setExtraKeyboardVisible] = useState(false);
    const [component, setComponent] = useState<React.ReactElement|null>(null);
    const [isTextInputFocused, setIsTextInputFocused] = useState(false);

    const showExtraKeyboard = useCallback((newComponent: React.ReactElement|null) => {
        // Do not use ExtraKeyboard on Android versions below 11
        if (Platform.OS === 'android' && Platform.Version < 30) {
            return;
        }
        setExtraKeyboardVisible(true);
        setComponent(newComponent);
        if (Keyboard.isVisible()) {
            Keyboard.dismiss();
        }
    }, []);

    const hideExtraKeyboard = useCallback(() => {
        // Do not use ExtraKeyboard on Android versions below 11
        if (Platform.OS === 'android' && Platform.Version < 30) {
            return;
        }
        setExtraKeyboardVisible(false);
        setComponent(null);
        if (Keyboard.isVisible()) {
            Keyboard.dismiss();
        }
    }, []);

    const registerTextInputFocus = useCallback(() => {
        // Do not use ExtraKeyboard on Android versions below 11
        if (Platform.OS === 'android' && Platform.Version < 30) {
            return;
        }

        // If the extra keyboard is opened if we don't do this
        // we get a glitch in the UI that will animate the extra keyboard down
        // and immediately bring the keyboard, by doing this
        // we delay hidding the extra keyboard, so that there is no animation glitch
        setIsTextInputFocused(true);
        setTimeout(() => {
            setExtraKeyboardVisible(false);
        }, 400);
    }, []);

    const registerTextInputBlur = useCallback(() => {
        // Do not use ExtraKeyboard on Android versions below 11
        if (Platform.OS === 'android' && Platform.Version < 30) {
            return;
        }

        setIsTextInputFocused(false);
    }, []);

    useEffect(() => {
        const keyboardHideListener = Keyboard.addListener('keyboardDidHide', () => {
            // Do not use ExtraKeyboard on Android versions below 11
            if (Platform.OS === 'android' && Platform.Version < 30) {
                return;
            }

            if (isTextInputFocused) {
                setExtraKeyboardVisible(false);
            }
        });

        return () => keyboardHideListener.remove();
    }, [isTextInputFocused]);

    return (
        <ExtraKeyboardContext.Provider
            value={{
                isExtraKeyboardVisible,
                component,
                showExtraKeyboard,
                hideExtraKeyboard,
                registerTextInputBlur,
                registerTextInputFocus,
            }}
        >
            {children}
        </ExtraKeyboardContext.Provider>
    );
});

export const useExtraKeyboardContext = (): ExtraKeyboardContextProps|undefined => {
    const context = useContext(ExtraKeyboardContext);
    if (!context) {
        throw new Error('useExtraKeyboardContext must be used within a ExtraKeyboardProvider');
    }
    return context;
};

export const useHideExtraKeyboardIfNeeded = (callback: (...args: any) => void, dependencies: React.DependencyList = []) => {
    const keyboardContext = useExtraKeyboardContext();

    return useCallback(preventDoubleTap((...args: any) => {
        if (keyboardContext?.isExtraKeyboardVisible) {
            keyboardContext.hideExtraKeyboard();

            /*
            /* At this point the early return is commented
            /* Based on the UX we actually want to have
            /* we can uncoment this and reaturn as early
            /* as the custom keyboard is hidden
            */
            // return;
        }

        if (Keyboard.isVisible()) {
            Keyboard.dismiss();
        }

        callback(...args);
    }), [keyboardContext, ...dependencies]);
};

const ExtraKeyboardComponent = () => {
    const keyb = useAnimatedKeyboard({isStatusBarTranslucentAndroid: true});
    const defaultKeyboardHeight = Platform.select({ios: 291, default: 240});
    const context = useExtraKeyboardContext();
    const insets = useSafeAreaInsets();
    const offset = useOffetForCurrentScreen();

    const maxKeyboardHeight = useDerivedValue(() => {
        if (keyb.state.value === KeyboardState.OPEN) {
            const keyboardOffset = keyb.height.value < 70 ? 0 : offset; // When using a hw keyboard
            return keyb.height.value + keyboardOffset;
        }

        return defaultKeyboardHeight;
    });

    const animatedStyle = useAnimatedStyle(() => {
        let height = keyb.height.value + offset;
        if (context?.isExtraKeyboardVisible) {
            height = withTiming(maxKeyboardHeight.value, {duration: 250});
        } else if (keyb.state.value === KeyboardState.CLOSED || keyb.state.value === KeyboardState.UNKNOWN) {
            height = withTiming(0, {duration: 250});
        }

        return {
            height,
            marginBottom: withTiming((keyb.state.value === KeyboardState.CLOSED || keyb.state.value === KeyboardState.CLOSING || keyb.state.value === KeyboardState.UNKNOWN) ? insets.bottom : 0, {duration: 250}),
        };
    }, [context, insets.bottom, offset]);

    return (
        <Animated.View style={animatedStyle}>
            {context?.isExtraKeyboardVisible && context.component}
        </Animated.View>
    );
};

// Do not use ExtraKeyboard on Android versions below 11
export const ExtraKeyboard = () => {
    if (Platform.OS === 'android' && Platform.Version < 30) {
        return null;
    }

    return (
        <ExtraKeyboardComponent/>
    );
};

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {Keyboard, Platform} from 'react-native';
import Animated, {KeyboardState, useAnimatedKeyboard, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming} from 'react-native-reanimated';
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
    const sub = NavigationStore.getSubject();

    useEffect(() => {
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
        setExtraKeyboardVisible(true);
        setComponent(newComponent);
        if (Keyboard.isVisible()) {
            Keyboard.dismiss();
        }
    }, []);

    const hideExtraKeyboard = useCallback(() => {
        setExtraKeyboardVisible(false);
        setComponent(null);
        if (Keyboard.isVisible()) {
            Keyboard.dismiss();
        }
    }, []);

    const registerTextInputFocus = useCallback(() => {
        setIsTextInputFocused(true);
        setTimeout(() => {
            setExtraKeyboardVisible(false);
        }, 400);
    }, []);

    const registerTextInputBlur = useCallback(() => {
        setIsTextInputFocused(false);
    }, []);

    useEffect(() => {
        const keyboardHideListener = Keyboard.addListener('keyboardDidHide', () => {
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
    }), [...dependencies]);
};

export const ExtraKeyboard = () => {
    const keyb = useAnimatedKeyboard({isStatusBarTranslucentAndroid: true});
    const maxKeyboardHeight = useSharedValue(Platform.select({ios: 291, default: 240}));
    const context = useExtraKeyboardContext();
    const insets = useSafeAreaInsets();
    const offset = useOffetForCurrentScreen();

    useDerivedValue(() => {
        if (keyb.state.value === KeyboardState.OPEN) {
            const keyboardOffset = keyb.height.value < 70 ? 0 : offset; // When using a hw keyboard
            maxKeyboardHeight.value = Math.max(maxKeyboardHeight.value, keyb.height.value) + keyboardOffset;
            return keyb.height.value + keyboardOffset;
        }

        return maxKeyboardHeight.value;
    });

    const animatedStyle = useAnimatedStyle(() => {
        let height = keyb.height.value + offset;
        if (keyb.height.value < 70) {
            height = 0; // When using a hw keyboard
        }
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

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {AccessibilityInfo, Keyboard, Platform} from 'react-native';
import Animated, {KeyboardState, useAnimatedKeyboard, useAnimatedStyle, useDerivedValue, withTiming} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Screens} from '@constants';
import {useIsTablet, useKeyboardHeight} from '@hooks/device';
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
    crossFadeIsEnabled: boolean;
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
    const [crossFadeIsEnabled, setCrossFade] = useState(false);

    useEffect(() => {
        AccessibilityInfo.prefersCrossFadeTransitions().then(setCrossFade);
    }, []);

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
                crossFadeIsEnabled,
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

export const ExtraKeyboard = () => {
    const keyb = useAnimatedKeyboard({isStatusBarTranslucentAndroid: true});
    const [isNativeKeyOpen, setNativeOpen] = useState(false);
    const defaultKeyboardHeight = Platform.select({ios: 291, default: 240});
    const context = useExtraKeyboardContext();
    const insets = useSafeAreaInsets();
    const offset = useOffetForCurrentScreen();
    const nativeHeight = useKeyboardHeight();

    useEffect(() => {
        setNativeOpen(nativeHeight > 0);
    }, [nativeHeight]);

    const maxKeyboardHeight = useDerivedValue(() => {
        if (keyb.state.value === KeyboardState.OPEN) {
            const keyboardOffset = keyb.height.value < 70 ? 0 : offset; // When using a hw keyboard
            return keyb.height.value + keyboardOffset;
        }

        return defaultKeyboardHeight;
    });

    const animatedStyle = useAnimatedStyle(() => {
        let height = keyb.height.value + offset;
        const isClose = keyb.state.value === KeyboardState.CLOSED || keyb.state.value === KeyboardState.UNKNOWN;
        const isCloseOrClosing = isClose || keyb.state.value === KeyboardState.CLOSING;
        const shouldClose = context?.crossFadeIsEnabled && !isCloseOrClosing && !isNativeKeyOpen;
        if (shouldClose) {
            keyb.state.set(KeyboardState.CLOSED);
        }
        if (keyb.height.value < 70) {
            height = 0; // When using a hw keyboard
        }
        if (context?.isExtraKeyboardVisible) {
            height = withTiming(maxKeyboardHeight.value, {duration: 250});
        } else if (isClose) {
            height = withTiming(0, {duration: 250});
        }

        return {
            maxHeight: context?.crossFadeIsEnabled ? nativeHeight : undefined,
            height,
            marginBottom: withTiming(isCloseOrClosing ? insets.bottom : 0, {duration: 250}),
        };
    }, [context, insets.bottom, offset, isNativeKeyOpen]);

    return (
        <Animated.View style={animatedStyle}>
            {context?.isExtraKeyboardVisible && context.component}
        </Animated.View>
    );
};

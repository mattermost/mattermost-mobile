// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {Keyboard, Platform} from 'react-native';
import Animated, {KeyboardState, useAnimatedKeyboard, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {preventDoubleTap} from '@app/utils/tap';

export type ExtraKeyboardContextProps = {
    isExtraKeyboardVisible: boolean;
    component: React.ReactElement|null;
    showExtraKeyboard: (component: React.ReactElement|null) => void;
    hideExtraKeyboard: () => void;
    registerTextInputFocus: () => void;
    registerTextInputBlur: () => void;
};

export const ExtraKeyboardContext = createContext<ExtraKeyboardContextProps|undefined>(undefined);

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
        // commented until we add the provider surrounding the code where we call this function
        // throw new Error('useExtraKeyboardContext must be used within a ExtraKeyboardProvider');
    }
    return context;
};

export const useHideExtraKeyboardIfNeeded = (callback: (...args: any) => void, dependencies: React.DependencyList = []) => {
    const keyboardContext = useExtraKeyboardContext();

    return useCallback(preventDoubleTap((...args: any) => {
        if (keyboardContext?.isExtraKeyboardVisible) {
            keyboardContext.hideExtraKeyboard();

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

    useDerivedValue(() => {
        if (keyb.state.value === KeyboardState.OPEN) {
            maxKeyboardHeight.value = Math.max(maxKeyboardHeight.value, keyb.height.value);
            return keyb.height.value;
        }

        return maxKeyboardHeight.value;
    });

    const animatedStyle = useAnimatedStyle(() => {
        let height = keyb.height.value;
        if (context?.isExtraKeyboardVisible) {
            height = withTiming(maxKeyboardHeight.value, {duration: 250});
        } else if (keyb.state.value === KeyboardState.CLOSED || keyb.state.value === KeyboardState.UNKNOWN) {
            height = withTiming(0, {duration: 250});
        }

        return {
            height,
            marginBottom: withTiming((keyb.state.value === KeyboardState.CLOSED || keyb.state.value === KeyboardState.CLOSING || keyb.state.value === KeyboardState.UNKNOWN) ? insets.bottom : 0, {duration: 250}),
        };
    }, [context, insets.bottom]);

    return (
        <Animated.View style={animatedStyle}>
            {context?.isExtraKeyboardVisible && context.component}
        </Animated.View>
    );
};

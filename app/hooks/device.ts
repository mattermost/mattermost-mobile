// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils, {type WindowDimensions} from '@mattermost/rnutils';
import React, {type RefObject, useEffect, useRef, useState, useContext} from 'react';
import {AppState, Keyboard, NativeEventEmitter, Platform, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {DeviceContext} from '@context/device';

import type {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

let utilsEmitter = new NativeEventEmitter(RNUtils);

export function testSetUtilsEmitter(emitter: NativeEventEmitter) {
    utilsEmitter = emitter;
}

export function useSplitView() {
    const {isSplit} = React.useContext(DeviceContext);
    return isSplit;
}

export function useAppState() {
    const [appState, setAppState] = useState(AppState.currentState);

    useEffect(() => {
        const listener = AppState.addEventListener('change', (nextState) => {
            setAppState(nextState);
        });

        return () => listener.remove();
    }, [appState]);

    return appState;
}

export function useWindowDimensions() {
    const [dimensions, setDimensions] = useState(RNUtils.getWindowDimensions());

    useEffect(() => {
        const listener = utilsEmitter.addListener('DimensionsChanged', (window: WindowDimensions) => {
            setDimensions(window);
        });

        return () => listener.remove();
    }, []);

    return dimensions;
}

export function useIsTablet() {
    const {isSplit, isTablet} = useContext(DeviceContext);
    return isTablet && !isSplit;
}

export function useKeyboardHeightWithDuration() {
    const [keyboardHeight, setKeyboardHeight] = useState({height: 0, duration: 0});
    const updateTimeout = useRef<NodeJS.Timeout | null>(null);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const show = Keyboard.addListener(Platform.select({ios: 'keyboardWillShow', default: 'keyboardDidShow'}), async (event) => {
            // Do not use set the height on Android versions below 11
            if (Platform.OS === 'android' && Platform.Version < 30) {
                return;
            }
            setKeyboardHeight({height: event.endCoordinates.height, duration: event.duration});
        });

        const hide = Keyboard.addListener(Platform.select({ios: 'keyboardWillHide', default: 'keyboardDidHide'}), (event) => {
            // Do not use set the height on Android versions below 11
            if (Platform.OS === 'android' && Platform.Version < 30) {
                return;
            }

            if (updateTimeout.current != null) {
                clearTimeout(updateTimeout.current);
                updateTimeout.current = null;
            }
            setKeyboardHeight({height: 0, duration: event.duration});
        });

        return () => {
            show.remove();
            hide.remove();
        };
    }, [insets.bottom]);

    return keyboardHeight;
}

export function useKeyboardHeight() {
    const {height} = useKeyboardHeightWithDuration();
    return height;
}

export function useViewPosition(viewRef: RefObject<View>, deps: React.DependencyList = []) {
    const [modalPosition, setModalPosition] = useState(0);
    const isTablet = useIsTablet();
    const height = useKeyboardHeight();

    useEffect(() => {
        if (Platform.OS === 'ios' && isTablet) {
            viewRef.current?.measureInWindow((_, y) => {
                if (y !== modalPosition) {
                    setModalPosition(y);
                }
            });
        }
    }, [...deps, isTablet, height, viewRef, modalPosition]);

    return modalPosition;
}

export function useKeyboardOverlap(viewRef: RefObject<View>, containerHeight: number) {
    const keyboardHeight = useKeyboardHeight();
    const isTablet = useIsTablet();
    const viewPosition = useViewPosition(viewRef, [containerHeight]);
    const dimensions = useWindowDimensions();
    const insets = useSafeAreaInsets();

    const bottomSpace = (dimensions.height - containerHeight - viewPosition);
    const tabletOverlap = Math.max(0, keyboardHeight - bottomSpace);
    const phoneOverlap = keyboardHeight || insets.bottom;
    const overlap = Platform.select({
        ios: isTablet ? tabletOverlap : phoneOverlap,
        default: 0,
    });

    return overlap;
}

export function useAvoidKeyboard(ref: RefObject<KeyboardAwareScrollView>, dimisher = 3) {
    const height = useKeyboardHeight();

    useEffect(() => {
        let offsetY = height / dimisher;
        if (offsetY < 80) {
            offsetY = 0;
        }

        ref.current?.scrollToPosition(0, offsetY);
    }, [height, dimisher, ref]);
}

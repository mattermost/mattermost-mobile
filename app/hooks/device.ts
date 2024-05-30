// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type RefObject, useEffect, useRef, useState, useContext} from 'react';
import {AppState, DeviceEventEmitter, Keyboard, Platform, useWindowDimensions, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {DeviceContext} from '@context/device';

import type {KeyboardTrackingViewRef, KeyboardWillShowEventData} from '@mattermost/keyboard-tracker';

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

export function useIsTablet() {
    const {isSplit, isTablet} = useContext(DeviceContext);
    return isTablet && !isSplit;
}

export function useKeyboardHeightWithDuration(keyboardTracker?: RefObject<KeyboardTrackingViewRef>) {
    const [keyboardHeight, setKeyboardHeight] = useState({height: 0, duration: 0});
    const updateTimeout = useRef<NodeJS.Timeout | null>(null);
    const insets = useSafeAreaInsets();

    // This is a magic number. With tracking view, to properly get the final position, this had to be added.
    const KEYBOARD_TRACKINGVIEW_SEPARATION = 4;

    const updateValue = (height: number, duration: number) => {
        if (updateTimeout.current != null) {
            clearTimeout(updateTimeout.current);
            updateTimeout.current = null;
        }
        updateTimeout.current = setTimeout(() => {
            setKeyboardHeight({height, duration});
            updateTimeout.current = null;
        }, 200);
    };

    useEffect(() => {
        const show = Keyboard.addListener(Platform.select({ios: 'keyboardWillShow', default: 'keyboardDidShow'}), async (event) => {
            if (!keyboardTracker?.current) {
                setKeyboardHeight({height: event.endCoordinates.height, duration: event.duration});
            }
        });

        const tracker = DeviceEventEmitter.addListener('MattermostKeyboardTrackerView', (event: KeyboardWillShowEventData) => {
            const props = event.nativeEvent;
            if (keyboardTracker?.current) {
                if (props.keyboardHeight) {
                    updateValue((props.trackingViewHeight + props.keyboardHeight) - KEYBOARD_TRACKINGVIEW_SEPARATION, props.animationDuration);
                } else {
                    updateValue((props.trackingViewHeight + insets.bottom) - KEYBOARD_TRACKINGVIEW_SEPARATION, props.animationDuration);
                }
            } else {
                setKeyboardHeight({height: props.keyboardFrameEndHeight, duration: props.animationDuration});
            }
        });

        const hide = Keyboard.addListener(Platform.select({ios: 'keyboardWillHide', default: 'keyboardDidHide'}), (event) => {
            if (updateTimeout.current != null) {
                clearTimeout(updateTimeout.current);
                updateTimeout.current = null;
            }
            setKeyboardHeight({height: 0, duration: event.duration});
        });

        return () => {
            show.remove();
            hide.remove();
            tracker.remove();
        };
    }, [keyboardTracker?.current && insets.bottom]);

    return keyboardHeight;
}

export function useKeyboardHeight(keyboardTracker?: RefObject<KeyboardTrackingViewRef>) {
    const {height} = useKeyboardHeightWithDuration(keyboardTracker);
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
    }, [...deps, isTablet, height]);

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

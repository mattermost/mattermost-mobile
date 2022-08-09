// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useRef, useState} from 'react';
import {AppState, Keyboard, NativeModules, Platform, useWindowDimensions} from 'react-native';
import {KeyboardTrackingViewRef} from 'react-native-keyboard-tracking-view';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Device} from '@constants';

const {MattermostManaged} = NativeModules;
const isRunningInSplitView = MattermostManaged.isRunningInSplitView;

export function useSplitView() {
    const [isSplitView, setIsSplitView] = useState(false);
    const dimensions = useWindowDimensions();

    useEffect(() => {
        if (Device.IS_TABLET) {
            isRunningInSplitView().then((result: {isSplitView: boolean}) => {
                setIsSplitView(result.isSplitView);
            });
        }
    }, [dimensions]);

    return isSplitView;
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
    const isSplitView = useSplitView();
    return Device.IS_TABLET && !isSplitView;
}

export function useKeyboardHeight(keyboardTracker?: React.RefObject<KeyboardTrackingViewRef>) {
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const updateTimeout = useRef<NodeJS.Timeout | null>(null);
    const insets = useSafeAreaInsets();

    // This is a magic number. With tracking view, to properly get the final position, this had to be added.
    const KEYBOARD_TRACKINGVIEW_SEPARATION = 4;

    const updateValue = (v: number) => {
        if (updateTimeout.current != null) {
            clearTimeout(updateTimeout.current);
            updateTimeout.current = null;
        }
        updateTimeout.current = setTimeout(() => {
            setKeyboardHeight(v);
            updateTimeout.current = null;
        }, 200);
    };

    useEffect(() => {
        const show = Keyboard.addListener(Platform.select({ios: 'keyboardWillShow', default: 'keyboardDidShow'}), (event) => {
            if (keyboardTracker?.current) {
                // eslint-disable-next-line max-nested-callbacks
                keyboardTracker.current.getNativeProps().then((x) => {
                    if (x.keyboardHeight) {
                        updateValue((x.trackingViewHeight + x.keyboardHeight) - KEYBOARD_TRACKINGVIEW_SEPARATION);
                    } else {
                        updateValue((x.trackingViewHeight + insets.bottom) - KEYBOARD_TRACKINGVIEW_SEPARATION);
                    }
                });
            } else {
                updateValue(event.endCoordinates.height);
            }
        });

        const hide = Keyboard.addListener(Platform.select({ios: 'keyboardWillHide', default: 'keyboardDidHide'}), () => {
            if (updateTimeout.current != null) {
                clearTimeout(updateTimeout.current);
                updateTimeout.current = null;
            }
            setKeyboardHeight(0);
        });

        return () => {
            show.remove();
            hide.remove();
        };
    }, [keyboardTracker && insets.bottom]);

    return keyboardHeight;
}

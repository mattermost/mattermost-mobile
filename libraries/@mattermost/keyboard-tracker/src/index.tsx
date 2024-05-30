// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {forwardRef, useCallback, useImperativeHandle, useRef} from 'react';
import {DeviceEventEmitter} from 'react-native';

import MattermostKeyboardTrackerView, {Commands, type KeyboardWillShowEventData, type NativeProps} from './MattermostKeyboardTrackerViewNativeComponent';

export * from './MattermostKeyboardTrackerViewNativeComponent';

export type KeyboardTrackingViewRef = {
    resetScrollView: (scrollViewNativeID: string) => void;
    pauseTracking: (scrollViewNativeID: string) => void;
    resumeTracking: (scrollViewNativeID: string) => void;
    scrollToStart: () => void;
};

type Props = NativeProps & {
    onKeyboardWillShow?: (e: KeyboardWillShowEventData) => void;
}

const KeyboardTrackingView = forwardRef<KeyboardTrackingViewRef, Props>((props, ref) => {
    const viewRef = useRef(null);

    useImperativeHandle(ref, () => ({
        resetScrollView(scrollViewNativeID: string) {
            if (viewRef.current) {
                Commands.resumeTracking(viewRef.current, scrollViewNativeID);
            }
        },
        pauseTracking(scrollViewNativeID: string) {
            if (viewRef.current) {
                Commands.pauseTracking(viewRef.current, scrollViewNativeID);
            }
        },
        resumeTracking(scrollViewNativeID: string) {
            if (viewRef.current) {
                Commands.resumeTracking(viewRef.current, scrollViewNativeID);
            }
        },
        scrollToStart() {
            if (viewRef.current) {
                Commands.scrollToStart(viewRef.current);
            }
        },
    }));

    const _onKeyboardShow = useCallback((e: KeyboardWillShowEventData) => {
        DeviceEventEmitter.emit('MattermostKeyboardTrackerView', e);
        props.onKeyboardWillShow?.(e);
    }, [props.onKeyboardWillShow]);

    return (
        <MattermostKeyboardTrackerView
            {...props}
            onKeyboardWillShow={_onKeyboardShow}
            ref={viewRef}
        />
    );
});

KeyboardTrackingView.displayName = 'KeyboardTrackingView';

export default KeyboardTrackingView;

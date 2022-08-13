// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

declare module 'react-native-keyboard-tracking-view' {
    import {ViewProps} from 'react-native';
    export interface KeyboardTrackingViewRef {
        pauseTracking: (id: string) => void;
        resumeTracking: (id: string) => void;
        resetScrollView: (id: string) => void;
        setNativeProps(nativeProps: object): void;
        getNativeProps: () => Promise<KeyboardTrackingViewNativeProps>;
    }

    type KeyboardTrackingViewNativeProps = {
        contentTopInset: number;
        keyboardHeight: number;
        trackingViewHeight: number;
    }

    interface KeyboardTrackingViewProps extends ViewProps{
        accessoriesContainerID?: string;
        normalList?: boolean;
        scrollViewNativeID?: string;
        viewInitialOffsetY?: number;
    }
    export const KeyboardTrackingView: React.ForwardRefExoticComponent<KeyboardTrackingViewProps & React.RefAttributes<KeyboardTrackingViewRef>>;
}

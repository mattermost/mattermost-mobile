// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

declare module 'react-native-keyboard-tracking-view' {
    import {ViewProps} from 'react-native';
    export interface KeyboardTrackingViewRef {
        resetScrollView: (id: string) => void;
        setNativeProps(nativeProps: object): void;
    }

    interface KeyboardTrackingViewProps extends ViewProps{
        accessoriesContainerID?: string;
        scrollViewNativeID?: string;
        normalList?: boolean;
    }
    export const KeyboardTrackingView: React.ForwardRefExoticComponent<KeyboardTrackingViewProps & React.RefAttributes<KeyboardTrackingViewRef>>;
}

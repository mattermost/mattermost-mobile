// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

import type {ColorValue, HostComponent, ViewProps} from 'react-native';
import type {BubblingEventHandler, Double, Float, WithDefault} from 'react-native/Libraries/Types/CodegenTypes';

type ScrollBehavior = 'KeyboardTrackingScrollBehaviorNone' | 'KeyboardTrackingScrollBehaviorScrollToBottomInvertedOnly' | 'KeyboardTrackingScrollBehaviorFixedOffset'

export type NativeKeyboardTrackerProps = Readonly<{
  trackingViewHeight: Double;
  keyboardHeight: Double;
  contentTopInset: Double;
  animationDuration: Double;
  keyboardFrameEndHeight: Float;
}>

export type KeyboardWillShowEventData = {
  nativeEvent: {
    trackingViewHeight: number;
    keyboardHeight: number;
    contentTopInset: number;
    animationDuration: number;
    keyboardFrameEndHeight: number;
  };
}

export interface NativeProps extends ViewProps {
  scrollBehavior?: WithDefault<ScrollBehavior, 'KeyboardTrackingScrollBehaviorNone'>;
  revealKeyboardInteractive?: boolean;
  manageScrollView?: WithDefault<boolean, true>;
  requiresSameParentToManageScrollView?: WithDefault<boolean, true>;
  addBottomView?: boolean;
  scrollToFocusedInput?: boolean;
  allowHitsOutsideBounds?: boolean;
  normalList?: boolean;
  viewInitialOffsetY?: WithDefault<Float, 0>;
  scrollViewNativeID?: string;
  accessoriesContainerID?: string;
  backgroundColor?: ColorValue;
  onKeyboardWillShow?: BubblingEventHandler<NativeKeyboardTrackerProps>;
}

export type MattermostKeyboardTrackerNativeComponentType = HostComponent<NativeProps>;

interface NativeCommands {
  readonly resetScrollView: (
    viewRef: React.ElementRef<MattermostKeyboardTrackerNativeComponentType>,
    scrollViewNativeID: string,
  ) => void;
  readonly pauseTracking: (
    viewRef: React.ElementRef<MattermostKeyboardTrackerNativeComponentType>,
    scrollViewNativeID: string,
  ) => void;
  readonly resumeTracking: (
    viewRef: React.ElementRef<MattermostKeyboardTrackerNativeComponentType>,
    scrollViewNativeID: string,
  ) => void;
  readonly scrollToStart: (
    viewRef: React.ElementRef<MattermostKeyboardTrackerNativeComponentType>,
  ) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
    supportedCommands: ['resetScrollView', 'pauseTracking', 'resumeTracking', 'scrollToStart'],
});

export default codegenNativeComponent<NativeProps>('MattermostKeyboardTrackerView');

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {requireNativeComponent, type HostComponent, type NativeSyntheticEvent, type ViewProps} from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

interface OnLinkPressedPayload {
  url: string;
}

interface OnLoadErrorPayload {
  message: string;
}

interface OnPasswordFailedPayload {
  remainingAttempts: number;
}

interface OnPasswordRequiredPayload {
  maxAttempts: number;
  remainingAttempts: number;
}

interface OnPasswordLimitReached {
  maxAttempts: number;
}

interface OnTapPayload {
  x: number;
  y: number;
  pageX: number;
  pageY: number;
  timestamp: number;
  pointerType: 'touch' | 'mouse' | 'pen';
}

export type OnLinkPressedEvent = NativeSyntheticEvent<OnLinkPressedPayload>;
export type OnLoadErrorEvent = NativeSyntheticEvent<OnLoadErrorPayload>;
export type OnPasswordFailedEvent = NativeSyntheticEvent<OnPasswordFailedPayload>;
export type OnPasswordLimitReachedEvent = NativeSyntheticEvent<OnPasswordLimitReached>;
export type OnPasswordRequiredEvent = NativeSyntheticEvent<OnPasswordRequiredPayload>;
export type OnTapEvent = NativeSyntheticEvent<OnTapPayload>;

export interface NativeProps extends ViewProps {
  source: string;
  password?: string;
  allowLinks?: boolean;
  onLinkPressed?: (event: OnLinkPressedEvent) => void;
  onLinkPressedDisabled?: () => void;
  onLoad?: () => void;
  onPasswordRequired?: (event: OnPasswordRequiredEvent) => void;
  onPasswordFailed?: (event: OnPasswordFailedEvent) => void;
  onPasswordFailureLimitReached?: (event: OnPasswordLimitReachedEvent) => void;
  onLoadError?: (event: OnLoadErrorEvent) => void;
  onTap?: (event: OnTapEvent) => void;
}

const COMPONENT_NAME = 'SecurePdfViewer';

let SecurePdfViewerNativeComponent: HostComponent<NativeProps>;

// @ts-expect-error global not defined
if (global?.nativeFabricUIManager == null) {
    // Paper (Old Architecture)
    SecurePdfViewerNativeComponent = requireNativeComponent<NativeProps>(COMPONENT_NAME);

} else {
    // Fabric (New Architecture)
    SecurePdfViewerNativeComponent = codegenNativeComponent<NativeProps>(COMPONENT_NAME);
}

export default SecurePdfViewerNativeComponent;


// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {StyleProp, ViewStyle} from 'react-native';

/**
 * Props for the Banner component
 *
 * A flexible banner component that positions itself absolutely on screen
 * with smart offset calculations based on existing UI elements.
 */
export interface BannerProps {

    /** The content to display inside the banner */
    children: React.ReactNode;

    /**
     * Duration of fade animation in milliseconds
     * @default 300
     */
    animationDuration?: number;

    /**
     * Custom styles applied to the banner content
     */
    style?: StyleProp<ViewStyle>;

    /**
     * Whether the banner can be dismissed by swiping
     * @default false
     */
    dismissible?: boolean;

    /**
     * Callback called when banner is dismissed via swipe
     */
    onDismiss?: () => void;

    /**
     * Swipe threshold to trigger dismiss (in pixels)
     * @default 100
     */
    swipeThreshold?: number;
}


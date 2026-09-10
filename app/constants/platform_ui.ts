// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';

import {BOTTOM_TAB_HEIGHT} from '@constants/view';
import {isTablet} from '@utils/helpers';

/**
 * iPhone-only platform UI alignment (Liquid Glass chrome).
 * Tablet and Android keep the existing chrome.
 */
export function isPlatformUiIos() {
    return Platform.OS === 'ios' && !isTablet();
}

/** iOS 26+ soft edge effects wash out nested channel/thread post lists when left automatic. */
export const HIDDEN_SCROLL_EDGE_EFFECTS = {
    top: 'hidden' as const,
    bottom: 'hidden' as const,
    left: 'hidden' as const,
    right: 'hidden' as const,
};

/** Resting compose pill inset from screen edges. */
export const FLOATING_COMPOSE_HORIZONTAL_INSET = 16;

/** Focused compose pill inset from screen edges (wider than resting). */
export const FLOATING_COMPOSE_FOCUSED_HORIZONTAL_INSET = 8;

export const FLOATING_COMPOSE_TAB_GAP = 8;

/** Equal inset inside the floating compose pill (plus / text / send). */
export const FLOATING_COMPOSE_PILL_INSET = 8;

/**
 * Soft elevated shadow for opaque floating chrome (compose pill).
 * NativeTabs / Liquid Glass owns its own system shadow — this matches that family
 * (low opacity, diffuse radius) without a heavy drop. Figma Elevation 5–adjacent.
 */
export const FLOATING_CHROME_SHADOW = {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.12,
    shadowRadius: 24,
} as const;

/**
 * Space reserved for the floating NativeTabs pill (home indicator + tab chrome).
 *
 * On iOS 26 NativeTabs, `safeAreaBottom` usually already includes the floating tab chrome.
 * Adding BOTTOM_TAB_HEIGHT on top double-counts and leaves a ~65pt gap.
 * When insets are home-indicator-only (safeAreaBottom <= tab height), add tab height explicitly.
 */
export function getFloatingTabClearance(safeAreaBottom: number) {
    return safeAreaBottom > BOTTOM_TAB_HEIGHT ?
        safeAreaBottom :
        safeAreaBottom + BOTTOM_TAB_HEIGHT;
}

/** Bottom inset when the native tab bar is visible — lifts compose above the floating pill. */
export function getFloatingComposeRestingInset(safeAreaBottom: number) {
    return getFloatingTabClearance(safeAreaBottom) + FLOATING_COMPOSE_TAB_GAP;
}

/** Soft centerChannelBg fade height behind NativeTabs over scrolling sheet content. */
export function getFloatingTabBarScrimHeight(safeAreaBottom: number) {
    return getFloatingTabClearance(safeAreaBottom);
}

export const CHANNEL_SHEET_RADIUS = 32;

export const CHROME_ICON_BUTTON_SIZE = 44;
export const CHROME_ICON_BUTTON_ICON_OPACITY = 0.64;
export const CHROME_ICON_BUTTON_DISABLED_ICON_OPACITY = 0.32;

/** Asymmetric: keep buttons tight under the notch, leave room below the glass chrome. */
export const CHROME_HEADER_TOP_INSET = 0;
export const CHROME_HEADER_BOTTOM_INSET = 8;
export const PLATFORM_UI_HEADER_HEIGHT = CHROME_ICON_BUTTON_SIZE + CHROME_HEADER_TOP_INSET + CHROME_HEADER_BOTTOM_INSET;

/** Space between left chrome buttons and the header title. */
export const CHROME_HEADER_TITLE_GAP = 16;

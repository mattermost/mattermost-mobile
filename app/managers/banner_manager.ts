// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Navigation} from 'react-native-navigation';

import {Screens} from '@constants';
import {showOverlay, dismissOverlay} from '@screens/navigation';
import {toMilliseconds} from '@utils/datetime';

import type {FloatingBannerConfig} from '@components/floating_banner/types';

const FLOATING_BANNER_OVERLAY_ID = 'floating-banner-overlay';
const BANNER_DEFAULT_TIME_TO_HIDE = toMilliseconds({seconds: 5});
const OVERLAY_DISMISS_DELAY = toMilliseconds({seconds: 2});

/**
 * BannerManager - Singleton for managing floating banner overlays
 *
 * This manager handles displaying banners at the top or bottom of the screen using
 * React Native Navigation overlays. It supports stacking multiple banners and manages
 * their lifecycle including auto-hide timers and user dismissals.
 *
 * **Architecture:**
 * - Uses a single overlay component that renders separate top and bottom banner sections
 * - Each section (top/bottom) has its own GestureHandlerRootView for independent gesture handling
 * - Supports both top and bottom positioned banners simultaneously without blocking screen interaction
 * - Employs a promise-chain queue to handle rapid successive banner updates
 * - Implements a 2-second delay before dismissing the overlay when the last banner is removed
 *
 * **Android Gesture Handling Limitation:**
 * On Android, when both top AND bottom banners are displayed simultaneously, only ONE of the
 * GestureHandlerRootView instances can properly register touch events. This is a known limitation
 * with React Native Gesture Handler on Android when multiple gesture root views exist in overlays.
 *
 * **Current Behavior:**
 * - iOS: Top and bottom banners work correctly together with independent gesture handling
 * - Android: If both top and bottom banners appear simultaneously, gestures may not work on one section
 *
 * **Workaround (Not Yet Implemented):**
 * To fully support Android, the implementation should:
 * 1. Detect when both top and bottom banners exist on Android
 * 2. Prioritize showing banners from one position (e.g., top takes precedence)
 * 3. Queue banners from the other position until the primary position is clear
 *
 * **Previous iOS-Only Solution:**
 * The implementation creates TWO separate GestureHandlerRootView instances - one for top
 * banners and one for bottom banners. Each is positioned and sized only for its banner content
 * using `useBannerGestureRootPosition` hook. On iOS this allows:
 * - Top and bottom banners to coexist without blocking the middle of the screen
 * - User interactions with app content between the banners
 * - Each banner section to handle gestures independently
 * - `pointerEvents='box-none'` on each GestureHandlerRootView allows touches to pass through
 *   non-banner areas to the content underneath
 *
 * @example
 * // Show a simple banner
 * BannerManager.showBanner({
 *   id: 'network-error',
 *   title: 'Connection Lost',
 *   message: 'Reconnecting...',
 *   type: 'error',
 *   position: 'top'
 * });
 *
 * @example
 * // Show multiple banners (they will stack)
 * BannerManager.showBanner({id: 'banner1', position: 'top', ...});
 * BannerManager.showBanner({id: 'banner2', position: 'bottom', ...});
 *
 * @example
 * // Show with auto-hide
 * BannerManager.showBannerWithAutoHide({
 *   id: 'success',
 *   message: 'Changes saved',
 *   type: 'success'
 * }, 3000);
 */
class BannerManagerSingleton {
    private activeBanners: FloatingBannerConfig[] = [];
    private overlayVisible = false;
    private autoHideTimers: Map<string, NodeJS.Timeout> = new Map();
    private updateQueue: Promise<void> = Promise.resolve();
    private dismissOverlayTimer: NodeJS.Timeout | null = null;
    private dismissOverlayResolve: (() => void) | null = null;

    private clearBannerTimer(bannerId: string) {
        const timer = this.autoHideTimers.get(bannerId);
        if (timer) {
            clearTimeout(timer);
            this.autoHideTimers.delete(bannerId);
        }
    }

    private clearAllTimers() {
        this.autoHideTimers.forEach((timer) => clearTimeout(timer));
        this.autoHideTimers.clear();
    }

    private cancelDismissOverlay() {
        if (this.dismissOverlayTimer) {
            clearTimeout(this.dismissOverlayTimer);
            this.dismissOverlayTimer = null;
        }

        // Resolve the pending Promise to unblock the queue
        if (this.dismissOverlayResolve) {
            this.dismissOverlayResolve();
            this.dismissOverlayResolve = null;
        }
    }

    private removeBannerFromList(bannerId: string) {
        const bannerIndex = this.activeBanners.findIndex((b) => b.id === bannerId);
        if (bannerIndex >= 0) {
            const banner = this.activeBanners[bannerIndex];
            this.activeBanners.splice(bannerIndex, 1);

            // Clear any auto-hide timer for this banner
            this.clearBannerTimer(bannerId);

            // Invoke onDismiss callback if it exists
            if (banner.onDismiss) {
                try {
                    banner.onDismiss();
                } catch {
                    // Silent catch to ensure cleanup still runs
                }
            }
        }
    }

    private updateOverlay() {
        this.updateQueue = this.updateQueue.then(async () => {
            if (!this.activeBanners.length) {
                if (this.overlayVisible) {
                    Navigation.updateProps(FLOATING_BANNER_OVERLAY_ID, {
                        banners: [],
                        onDismiss: () => {
                            // No-op: no banners to dismiss
                        },
                    });

                    await new Promise<void>((resolve) => {
                        this.dismissOverlayResolve = resolve;
                        this.dismissOverlayTimer = setTimeout(() => {
                            this.dismissOverlayResolve = null;
                            resolve();
                        }, OVERLAY_DISMISS_DELAY);
                    });

                    if (!this.activeBanners.length && this.overlayVisible) {
                        await dismissOverlay(FLOATING_BANNER_OVERLAY_ID);
                        this.overlayVisible = false;
                    }
                    this.dismissOverlayTimer = null;
                }
                return;
            }

            this.cancelDismissOverlay();

            const handleDismiss = (id: string) => {
                this.removeBannerFromList(id);
                this.updateOverlay();
            };

            const bannersWithDismissProps = this.activeBanners.map((banner) => {
                if (banner.customComponent && React.isValidElement(banner.customComponent)) {
                    const props: Partial<Record<string, unknown>> = {
                        onDismiss: () => handleDismiss(banner.id),
                        dismissible: banner.dismissible,
                    };
                    return {
                        ...banner,
                        customComponent: React.cloneElement(banner.customComponent, props),
                    };
                }
                return banner;
            });

            if (this.overlayVisible) {
                Navigation.updateProps(FLOATING_BANNER_OVERLAY_ID, {
                    banners: bannersWithDismissProps,
                    onDismiss: handleDismiss,
                });
            } else {
                showOverlay(
                    Screens.FLOATING_BANNER,
                    {
                        banners: bannersWithDismissProps,
                        onDismiss: handleDismiss,
                    },
                    {
                        overlay: {
                            interceptTouchOutside: false,
                        },
                    },
                    FLOATING_BANNER_OVERLAY_ID,
                );
                this.overlayVisible = true;
            }
        });
    }

    showBanner(bannerConfig: FloatingBannerConfig) {
        this.removeBannerFromList(bannerConfig.id);

        this.activeBanners.push(bannerConfig);

        this.updateOverlay();
    }

    showBannerWithAutoHide(bannerConfig: FloatingBannerConfig, durationMs: number = BANNER_DEFAULT_TIME_TO_HIDE) {
        this.showBanner(bannerConfig);

        const timer = setTimeout(() => {
            this.hideBanner(bannerConfig.id);
        }, durationMs);

        this.autoHideTimers.set(bannerConfig.id, timer);
    }

    /**
     * Hides a specific banner by ID.
     *
     * @param bannerId - Required banner ID to hide. This ensures explicit control and prevents
     *                   accidental dismissal of banners from other systems.
     *
     * @example
     * BannerManager.hideBanner('network-error');
     *
     * @remarks
     * If you need to clear all banners, use {@link hideAllBanners} instead.
     */
    hideBanner(bannerId: string) {
        this.removeBannerFromList(bannerId);
        this.updateOverlay();
    }

    hideAllBanners() {
        this.clearAllTimers();
        this.activeBanners = [];
        this.updateOverlay();
    }

    cleanup() {
        this.clearAllTimers();
        this.cancelDismissOverlay();
        this.activeBanners = [];
        if (this.overlayVisible) {
            dismissOverlay(FLOATING_BANNER_OVERLAY_ID);
            this.overlayVisible = false;
        }
    }

}

export const BannerManager = new BannerManagerSingleton();

export const testExports = {
    BannerManager: BannerManagerSingleton,
};

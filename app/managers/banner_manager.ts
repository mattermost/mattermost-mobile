// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Navigation} from 'react-native-navigation';

import {Screens} from '@constants';
import {showOverlay, dismissOverlay} from '@screens/navigation';
import {toMilliseconds} from '@utils/datetime';

import type {BannerConfig} from '@components/floating_banner/types';

const FLOATING_BANNER_OVERLAY_ID = 'floating-banner-overlay';
const TIME_TO_CLOSE = toMilliseconds({seconds: 5});
const OVERLAY_DISMISS_DELAY = toMilliseconds({seconds: 2});

enum UpdateState {
    IDLE = 'idle',
    IN_PROGRESS = 'in-progress',
    IN_PROGRESS_PENDING = 'in-progress-pending',
}

class BannerManagerSingleton {
    private activeBanners: BannerConfig[] = [];
    private overlayVisible = false;
    private autoHideTimers: Map<string, NodeJS.Timeout> = new Map();
    private updateState: UpdateState = UpdateState.IDLE;
    private dismissOverlayTimer: NodeJS.Timeout | null = null;

    /**
     * Function to manually complete the 2-second overlay dismiss delay.
     *
     * Why the delay: When the last banner is removed, we wait 2 seconds before
     * dismissing the overlay. This prevents repeatedly dismissing and recreating
     * the overlay when banners are being rapidly replaced (e.g., connection status
     * changing from "disconnected" → "reconnecting" → "connected"). Without the
     * delay, the overlay would flicker as it's dismissed and immediately recreated.
     *
     * The problem: If a new banner IS added during those 2 seconds, we need to
     * cancel the dismiss and show the new banner instead.
     *
     * The solution: We store the Promise's resolve function so we can call it early
     * when cancelling, allowing the queued banner update to process immediately
     * instead of being stuck waiting for the 2-second timeout.
     *
     * Without this, adding a banner during the delay would cause a deadlock where
     * the queue never processes the new banner.
     */
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

    private async updateOverlay() {
        if (this.updateState !== UpdateState.IDLE) {
            this.updateState = UpdateState.IN_PROGRESS_PENDING;
            return;
        }

        this.updateState = UpdateState.IN_PROGRESS;

        try {
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

            // Clone banners and add dismiss handlers
            const bannersWithDismiss = this.activeBanners.map((banner) => {
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
                    banners: bannersWithDismiss,
                    onDismiss: handleDismiss,
                });
            } else {
                showOverlay(
                    Screens.FLOATING_BANNER,
                    {
                        banners: bannersWithDismiss,
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
        } finally {
            // @ts-expect-error - updateState can become IN_PROGRESS_PENDING during async await
            const hasPendingUpdate: boolean = this.updateState === UpdateState.IN_PROGRESS_PENDING;
            this.updateState = UpdateState.IDLE;

            if (hasPendingUpdate) {
                this.updateOverlay();
            }
        }
    }

    showBanner(bannerConfig: BannerConfig) {
        this.removeBannerFromList(bannerConfig.id);

        this.activeBanners.push(bannerConfig);

        this.updateOverlay();
    }

    showBannerWithAutoHide(bannerConfig: BannerConfig, durationMs: number = TIME_TO_CLOSE) {
        this.showBanner(bannerConfig);

        const timer = setTimeout(() => {
            this.hideBanner(bannerConfig.id);
        }, durationMs);

        this.autoHideTimers.set(bannerConfig.id, timer);
    }

    hideBanner(bannerId?: string) {
        if (bannerId) {
            this.removeBannerFromList(bannerId);
        } else {
            this.clearAllTimers();
            this.activeBanners = [];
        }

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

    getCurrentBannerId(): string | null {
        return this.isBannerVisible() ? this.activeBanners[this.activeBanners.length - 1].id : null;
    }

    isBannerVisible(): boolean {
        return Boolean(this.activeBanners.length);
    }
}

export const BannerManager = new BannerManagerSingleton();

export const testExports = {
    BannerManager: BannerManagerSingleton,
};

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Screens} from '@constants';
import {showOverlay, dismissOverlay} from '@screens/navigation';
import {toMilliseconds} from '@utils/datetime';

import type {BannerConfig} from '@context/floating_banner';

const FLOATING_BANNER_OVERLAY_ID = 'floating-banner-overlay';
const TIME_TO_OPEN = toMilliseconds({seconds: 1});
const TIME_TO_CLOSE = toMilliseconds({seconds: 5});

class BannerManagerSingleton {
    private isVisible = false;
    private openTimeout: NodeJS.Timeout | null = null;
    private closeTimeout: NodeJS.Timeout | null = null;
    private currentBannerId: string | null = null;
    private currentOnDismiss: (() => void) | null = null;

    private clearTimeout(timeout: NodeJS.Timeout | null) {
        if (timeout) {
            clearTimeout(timeout);
        }
    }

    /**
     * Shows a banner immediately
     */
    showBanner(bannerConfig: BannerConfig) {
        // Always force fresh show on request; overlay might have been dismissed by navigation
        if (this.isVisible) {
            dismissOverlay(FLOATING_BANNER_OVERLAY_ID);
            this.isVisible = false;
            this.currentBannerId = null;
        }

        this.isVisible = true;
        this.currentBannerId = bannerConfig.id;

        const originalOnDismiss = bannerConfig.onDismiss;
        this.currentOnDismiss = originalOnDismiss || null;

        const handleDismiss = () => {
            this.isVisible = false;
            this.currentBannerId = null;

            // Call consumer-provided onDismiss first so business logic can run
            if (typeof originalOnDismiss === 'function') {
                try {
                    originalOnDismiss();
                } catch {
                    // no-op to ensure cleanup still runs
                }
            }
            this.currentOnDismiss = null;

            dismissOverlay(FLOATING_BANNER_OVERLAY_ID);
        };

        // Ensure custom content receives onDismiss so the X button works
        let customContent = bannerConfig.customContent;
        if (customContent && React.isValidElement(customContent)) {
            const props: Partial<Record<string, unknown>> = {
                onDismiss: handleDismiss,
                dismissible: true,
            };
            customContent = React.cloneElement(customContent, props);
        }

        // Update the banner config with our dismiss handler
        const configWithDismiss = {
            ...bannerConfig,
            customContent,
            onDismiss: handleDismiss,
        };

        showOverlay(
            Screens.FLOATING_BANNER,
            {
                banners: [configWithDismiss],
                onDismiss: (id: string) => {
                    if (id === bannerConfig.id) {
                        this.isVisible = false;
                        this.currentBannerId = null;
                        if (typeof originalOnDismiss === 'function') {
                            try {
                                originalOnDismiss();
                            } catch {
                                // no-op
                            }
                        }
                        this.currentOnDismiss = null;
                        dismissOverlay(FLOATING_BANNER_OVERLAY_ID);
                    }
                },
            },
            {
                overlay: {
                    interceptTouchOutside: false,
                },
            },
            FLOATING_BANNER_OVERLAY_ID,
        );
    }

    /**
     * Shows a banner with auto-hide after the specified duration
     */
    showBannerWithAutoHide(bannerConfig: BannerConfig, durationMs: number = TIME_TO_CLOSE) {
        this.showBanner(bannerConfig);
        this.closeTimeout = setTimeout(() => {
            this.hideBanner();
        }, durationMs);
    }

    /**
     * Shows a banner with a delay before appearing
     */
    showBannerWithDelay(bannerConfig: BannerConfig, delayMs: number = TIME_TO_OPEN) {
        this.openTimeout = setTimeout(() => {
            this.showBanner(bannerConfig);
        }, delayMs);
    }

    /**
     * Hides the currently visible banner
     */
    hideBanner() {
        if (!this.isVisible) {
            return;
        }

        this.clearTimeout(this.openTimeout);
        this.clearTimeout(this.closeTimeout);

        // Invoke the consumer onDismiss synchronously to allow business logic to update
        if (this.currentOnDismiss) {
            try {
                this.currentOnDismiss();
            } catch {
                // no-op
            }
            this.currentOnDismiss = null;
        }
        dismissOverlay(FLOATING_BANNER_OVERLAY_ID);
        this.isVisible = false;
        this.currentBannerId = null;
    }

    /**
     * Cleans up all timeouts and resets the manager state
     */
    cleanup() {
        this.clearTimeout(this.openTimeout);
        this.clearTimeout(this.closeTimeout);
        this.hideBanner();
    }

    /**
     * Gets the currently shown banner ID
     */
    getCurrentBannerId(): string | null {
        return this.currentBannerId;
    }

    /**
     * Checks if a banner is currently visible
     */
    isBannerVisible(): boolean {
        return this.isVisible;
    }
}

export const BannerManager = new BannerManagerSingleton();

export const testExports = {
    BannerManager: BannerManagerSingleton,
};

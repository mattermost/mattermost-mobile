// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Screens} from '@constants';
import {showOverlay, dismissOverlay} from '@screens/navigation';
import {toMilliseconds} from '@utils/datetime';

import type {BannerConfig} from '@components/floating_banner/types';

const FLOATING_BANNER_OVERLAY_ID = 'floating-banner-overlay';
const TIME_TO_CLOSE = toMilliseconds({seconds: 5});

class BannerManagerSingleton {
    private isVisible = false;
    private closeTimeout: NodeJS.Timeout | null = null;
    private currentBannerId: string | null = null;
    private currentOnDismiss: (() => void) | null = null;

    private clearTimeout(timeout: NodeJS.Timeout | null) {
        if (timeout) {
            clearTimeout(timeout);
        }
    }

    private invokeCurrentOnDismiss() {
        if (typeof this.currentOnDismiss === 'function') {
            try {
                this.currentOnDismiss();
            } catch {
                // no-op to ensure cleanup still runs
            }
        }
        this.currentOnDismiss = null;
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

        this.currentOnDismiss = bannerConfig.onDismiss || null;

        const handleDismiss = () => {
            this.isVisible = false;
            this.currentBannerId = null;

            this.invokeCurrentOnDismiss();
            dismissOverlay(FLOATING_BANNER_OVERLAY_ID);
        };

        // Ensure custom component receives onDismiss so the X button works
        let customComponent = bannerConfig.customComponent;
        if (customComponent && React.isValidElement(customComponent)) {
            const props: Partial<Record<string, unknown>> = {
                onDismiss: handleDismiss,
                dismissible: true,
            };
            customComponent = React.cloneElement(customComponent, props);
        }

        // Update the banner config with our dismiss handler
        const configWithDismiss = {
            ...bannerConfig,
            customComponent,
            onDismiss: handleDismiss,
        };

        showOverlay(
            Screens.FLOATING_BANNER,
            {
                banners: [configWithDismiss],
                onDismiss: (id: string) => {
                    if (id === bannerConfig.id) {
                        handleDismiss();
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
     * Hides the currently visible banner
     */
    hideBanner() {
        if (!this.isVisible) {
            return;
        }

        this.clearTimeout(this.closeTimeout);

        this.invokeCurrentOnDismiss();
        dismissOverlay(FLOATING_BANNER_OVERLAY_ID);
        this.isVisible = false;
        this.currentBannerId = null;
    }

    /**
     * Cleans up all timeouts and resets the manager state
     */
    cleanup() {
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

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {createContext, useContext, useState, useCallback, type ReactNode} from 'react';

import FloatingBanner from './floating_banner';

export interface BannerConfig {
    id: string;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    dismissible?: boolean;
    autoHideDuration?: number;
    position?: 'top' | 'bottom';
    onPress?: () => void;
    onDismiss?: () => void;
    customContent?: React.ReactNode;
}

interface BannerContextType {
    banners: BannerConfig[];
    showBanner: (config: BannerConfig) => void;
    hideBanner: (id: string) => void;
    hideAllBanners: () => void;
}

const BannerContext = createContext<BannerContextType | undefined>(undefined);

export const useBanner = (): BannerContextType => {
    const context = useContext(BannerContext);
    if (!context) {
        throw new Error('useBanner must be used within a FloatingBannerProvider');
    }
    return context;
};

export const useBannerActions = () => {
    const {showBanner, hideBanner, hideAllBanners} = useBanner();

    const showSuccess = useCallback((title: string, message: string, options?: Partial<BannerConfig>) => {
        showBanner({
            id: `success-${Date.now()}`,
            title,
            message,
            type: 'success',
            autoHideDuration: 3000,
            dismissible: true,
            ...options,
        });
    }, [showBanner]);

    const showError = useCallback((title: string, message: string, options?: Partial<BannerConfig>) => {
        showBanner({
            id: `error-${Date.now()}`,
            title,
            message,
            type: 'error',
            dismissible: true,
            ...options,
        });
    }, [showBanner]);

    const showInfo = useCallback((title: string, message: string, options?: Partial<BannerConfig>) => {
        showBanner({
            id: `info-${Date.now()}`,
            title,
            message,
            type: 'info',
            autoHideDuration: 5000,
            dismissible: true,
            ...options,
        });
    }, [showBanner]);

    const showWarning = useCallback((title: string, message: string, options?: Partial<BannerConfig>) => {
        showBanner({
            id: `warning-${Date.now()}`,
            title,
            message,
            type: 'warning',
            dismissible: true,
            ...options,
        });
    }, [showBanner]);

    return {
        showSuccess,
        showError,
        showInfo,
        showWarning,
        showCustom: showBanner,
        hideBanner,
        hideAllBanners,
    };
};

export const FloatingBannerProvider: React.FC<{children: ReactNode}> = ({children}) => {
    const [banners, setBanners] = useState<BannerConfig[]>([]);

    const hideBanner = useCallback((id: string) => {
        // eslint-disable-next-line max-nested-callbacks
        setBanners((prev) => prev.filter((banner) => banner.id !== id));
    }, []);

    const showBanner = useCallback((config: BannerConfig) => {
        // eslint-disable-next-line max-nested-callbacks
        setBanners((prev) => [...prev.filter((banner) => banner.id !== config.id), config]);

        if (config.autoHideDuration) {
            setTimeout(() => hideBanner(config.id), config.autoHideDuration);
        }
    }, [hideBanner]);

    const hideAllBanners = useCallback(() => {
        setBanners([]);
    }, []);

    const contextValue: BannerContextType = {
        banners,
        showBanner,
        hideBanner,
        hideAllBanners,
    };

    return (
        <BannerContext.Provider value={contextValue}>
            {children}
            <FloatingBanner/>
        </BannerContext.Provider>
    );
};

export default FloatingBannerProvider;


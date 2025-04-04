// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General, License} from '@constants';

import {shouldShowChannelBanner} from './channel';

describe('shouldShowChannelBanner', () => {
    const validLicense = {
        SkuShortName: License.SKU_SHORT_NAME.Premium,
    };

    const validBannerInfo = {
        enabled: true,
        text: 'Banner text',
        background_color: '#FF0000',
    };

    it('should return false when license is not provided', () => {
        expect(shouldShowChannelBanner(General.OPEN_CHANNEL, undefined, validBannerInfo)).toBe(false);
    });

    it('should return false when banner info is not provided', () => {
        expect(shouldShowChannelBanner(General.OPEN_CHANNEL, validLicense, undefined)).toBe(false);
    });

    it('should return false when license is not premium', () => {
        const nonPremiumLicense = {
            SkuShortName: License.SKU_SHORT_NAME.Professional,
        };
        expect(shouldShowChannelBanner(General.OPEN_CHANNEL, nonPremiumLicense, validBannerInfo)).toBe(false);
    });

    it('should return false when banner info is incomplete', () => {
        const incompleteBannerInfo = {
            enabled: true,
            text: 'Banner text',
            background_color: '',
        };
        expect(shouldShowChannelBanner(General.OPEN_CHANNEL, validLicense, incompleteBannerInfo)).toBe(false);
    });

    it('should return false when banner is not enabled', () => {
        const disabledBannerInfo = {
            enabled: false,
            text: 'Banner text',
            background_color: '#FF0000',
        };
        expect(shouldShowChannelBanner(General.OPEN_CHANNEL, validLicense, disabledBannerInfo)).toBe(false);
    });

    it('should return false for invalid channel types', () => {
        expect(shouldShowChannelBanner(General.DM_CHANNEL, validLicense, validBannerInfo)).toBe(false);
        expect(shouldShowChannelBanner(General.GM_CHANNEL, validLicense, validBannerInfo)).toBe(false);
    });

    it('should return true for valid open channel with complete banner info and premium license', () => {
        expect(shouldShowChannelBanner(General.OPEN_CHANNEL, validLicense, validBannerInfo)).toBe(true);
    });

    it('should return true for valid private channel with complete banner info and premium license', () => {
        expect(shouldShowChannelBanner(General.PRIVATE_CHANNEL, validLicense, validBannerInfo)).toBe(true);
    });
});

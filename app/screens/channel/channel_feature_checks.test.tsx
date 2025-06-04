// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General, License} from '@constants';
import {shouldShowChannelBanner} from '@screens/channel/channel_feature_checks';

describe('shouldShowChannelBanner', () => {
    const validLicense = {
        SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced,
    } as ClientLicense;

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

    it('should return false when license is not professional', () => {
        const nonEnterpriseAdvancedLicense = {
            SkuShortName: License.SKU_SHORT_NAME.Professional,
        } as ClientLicense;
        expect(shouldShowChannelBanner(General.OPEN_CHANNEL, nonEnterpriseAdvancedLicense, validBannerInfo)).toBe(false);
    });

    it('should return false when license is not enterprise', () => {
        const nonEnterpriseAdvancedLicense = {
            SkuShortName: License.SKU_SHORT_NAME.Enterprise,
        } as ClientLicense;
        expect(shouldShowChannelBanner(General.OPEN_CHANNEL, nonEnterpriseAdvancedLicense, validBannerInfo)).toBe(false);
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

    it('should return false for DM and GM channels', () => {
        expect(shouldShowChannelBanner(General.DM_CHANNEL, validLicense, validBannerInfo)).toBe(false);
        expect(shouldShowChannelBanner(General.GM_CHANNEL, validLicense, validBannerInfo)).toBe(false);
    });

    it('should return true for valid open channel with complete banner info and enterprise advanced license', () => {
        expect(shouldShowChannelBanner(General.OPEN_CHANNEL, validLicense, validBannerInfo)).toBe(true);
    });

    it('should return true for valid private channel with complete banner info and enterprise advanced license', () => {
        expect(shouldShowChannelBanner(General.PRIVATE_CHANNEL, validLicense, validBannerInfo)).toBe(true);
    });
});

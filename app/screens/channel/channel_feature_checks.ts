// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General, License} from '@constants';

export function shouldShowChannelBanner(channelType: ChannelType, license?: ClientLicense, bannerInfo?: ChannelBannerInfo): boolean {
    if (!license || !bannerInfo) {
        return false;
    }

    const isPremiumLicense = license.SkuShortName === License.SKU_SHORT_NAME.Premium;
    const bannerInfoComplete = Boolean(bannerInfo.enabled && bannerInfo.text && bannerInfo.background_color);
    const isValidChannelType = channelType === General.OPEN_CHANNEL || channelType === General.PRIVATE_CHANNEL;

    return isPremiumLicense && bannerInfoComplete && isValidChannelType;
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {of as of$, type Observable} from 'rxjs';
import {combineLatestWith, switchMap} from 'rxjs/operators';

import {General, License} from '@constants';
import {observeChannel} from '@queries/servers/channel';
import {observeLicense} from '@queries/servers/system';

import type Database from '@nozbe/watermelondb/Database';

export function observeChannelBannerIncluded(database: Database, channelType: Observable<ChannelType | undefined>, channelId: Observable<string>): Observable<boolean> {
    const license = observeLicense(database);
    const bannerInfo = channelId.pipe(
        switchMap((cId) => observeChannel(database, cId)),
        switchMap((channel) => of$(channel?.bannerInfo)),
    );

    return channelType.pipe(
        combineLatestWith(license, bannerInfo),
        switchMap(([channelTypeValue, licenseValue, bannerInfoValue]) =>
            of$(shouldShowChannelBanner(channelTypeValue, licenseValue, bannerInfoValue)),
        ),
    );
}

export function shouldShowChannelBanner(channelType?: ChannelType, license?: ClientLicense, bannerInfo?: ChannelBannerInfo): boolean {
    if (!license || !bannerInfo || !channelType) {
        return false;
    }

    const isEnterpriseAdvancedLicense = license.SkuShortName === License.SKU_SHORT_NAME.EnterpriseAdvanced;
    const bannerInfoComplete = Boolean(bannerInfo.enabled && bannerInfo.text && bannerInfo.background_color);
    const isValidChannelType = channelType === General.OPEN_CHANNEL || channelType === General.PRIVATE_CHANNEL;

    return isEnterpriseAdvancedLicense && bannerInfoComplete && isValidChannelType;
}

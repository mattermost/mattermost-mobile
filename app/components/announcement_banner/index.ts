// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeConfig, observeLastDismissedAnnouncement, observeLicense} from '@queries/servers/system';

import AnnouncementBanner from './announcement_banner';

import type {WithDatabaseArgs} from '@typings/database/database';

type WithConfigArgs = {
    config?: ClientConfig;
    license?: ClientLicense;
}& WithDatabaseArgs;

const withConfig = withObservables([], ({database}: WithDatabaseArgs) => ({
    config: observeConfig(database),
    license: observeLicense(database),
}));

const enhanced = withObservables(['config', 'license'], ({config, license, database}: WithConfigArgs) => {
    const bannerDismissed = observeLastDismissedAnnouncement(database).pipe(
        switchMap((aa) => of$((config?.AllowBannerDismissal === 'true') && (aa.length ? aa[0].value === config?.BannerText : false))),
    );
    return {
        bannerColor: of$(config?.BannerColor),
        bannerEnabled: of$(config?.EnableBanner === 'true' && license?.IsLicensed === 'true'),
        bannerText: of$(config?.BannerText || ''),
        bannerTextColor: of$(config?.BannerTextColor || '#000'),
        bannerDismissed,
    };
});

export default withDatabase(withConfig(enhanced(AnnouncementBanner)));

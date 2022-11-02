// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';

import {observeConfig, observeLicense} from '@queries/servers/system';

import ExpandedAnnouncementBanner from './expanded_announcement_banner';

import type {WithDatabaseArgs} from '@typings/database/database';

type WithConfigArgs = {
    config?: ClientConfig;
};

const withConfig = withObservables([], ({database}: WithDatabaseArgs) => ({
    config: observeConfig(database),
    license: observeLicense(database),
}));

const enhanced = withObservables(['config'], ({config}: WithConfigArgs) => {
    return {
        allowDismissal: of$(config?.AllowBannerDismissal === 'true'),
        bannerText: of$(config?.BannerText || ''),
    };
});

export default withDatabase(withConfig(enhanced(ExpandedAnnouncementBanner)));

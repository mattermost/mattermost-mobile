// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeConfigBooleanValue, observeConfigValue} from '@queries/servers/system';

import ExpandedAnnouncementBanner from './expanded_announcement_banner';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        allowDismissal: observeConfigBooleanValue(database, 'AllowBannerDismissal'),
        bannerText: observeConfigValue(database, 'BannerText'),
    };
});

export default withDatabase(enhanced(ExpandedAnnouncementBanner));

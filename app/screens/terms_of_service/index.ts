// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeConfigValue} from '@queries/servers/system';
import {observeShowToS} from '@queries/servers/terms_of_service';

import TermsOfService from './terms_of_service';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        siteName: observeConfigValue(database, 'SiteName'),
        showToS: observeShowToS(database),
    };
});

export default withDatabase(enhanced(TermsOfService));

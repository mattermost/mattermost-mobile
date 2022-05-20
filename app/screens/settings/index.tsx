// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeConfigValue} from '@queries/servers/system';
import {isValidUrl} from '@utils/url';

import Settings from './settings';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const siteName = observeConfigValue(database, 'SiteName');
    const showHelp = observeConfigValue(database, 'HelpLink').pipe(switchMap((link) => of$(link ? isValidUrl(link) : false)));

    return {
        showHelp,
        siteName,
    };
});

export default withDatabase(enhanced(Settings));

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeConfig} from '@queries/servers/system';
import {isValidUrl} from '@utils/url';

import Settings from './settings';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const config = observeConfig(database);
    const siteName = config.pipe(switchMap((c) => of$(c?.SiteName)));
    const showHelp = observeConfig(database).pipe(switchMap((c) => of$(c?.HelpLink ? isValidUrl(c.HelpLink) : false)));

    return {
        showHelp,
        siteName,
    };
});

export default withDatabase(enhanced(Settings));

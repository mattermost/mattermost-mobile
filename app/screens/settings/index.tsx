// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeConfigValue} from '@queries/servers/system';
import {isValidUrl} from '@utils/url';

import Settings from './settings';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const helpLink = observeConfigValue(database, 'HelpLink');
    const showHelp = helpLink.pipe(switchMap((link: string) => of$(link ? isValidUrl(link) : false)));
    const siteName = observeConfigValue(database, 'SiteName');

    return {
        helpLink,
        showHelp,
        siteName,
    };
});

export default withDatabase(enhanced(Settings));

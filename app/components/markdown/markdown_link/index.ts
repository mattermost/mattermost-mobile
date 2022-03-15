// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeConfig} from '@queries/servers/system';

import MarkdownLink from './markdown_link';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    const config = observeConfig(database);
    const experimentalNormalizeMarkdownLinks = config.pipe(
        switchMap((cfg) => of$(cfg?.ExperimentalNormalizeMarkdownLinks)),
    );
    const siteURL = config.pipe(
        switchMap((cfg) => of$(cfg?.SiteURL)),
    );

    return {
        experimentalNormalizeMarkdownLinks,
        siteURL,
    };
});

export default withDatabase(enhance(MarkdownLink));

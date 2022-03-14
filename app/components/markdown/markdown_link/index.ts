// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';

import MarkdownLink from './markdown_link';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';

type ConfigValue = {
    value: ClientConfig;
}

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    const config = database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG);
    const experimentalNormalizeMarkdownLinks = config.pipe(
        switchMap(({value}: ConfigValue) => of$(value.ExperimentalNormalizeMarkdownLinks)),
    );
    const siteURL = config.pipe(
        switchMap(({value}: ConfigValue) => of$(value.SiteURL)),
    );

    return {
        experimentalNormalizeMarkdownLinks,
        siteURL,
    };
});

export default withDatabase(enhance(MarkdownLink));

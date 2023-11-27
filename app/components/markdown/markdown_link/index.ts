// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeConfigValue} from '@queries/servers/system';

import MarkdownLink from './markdown_link';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    const experimentalNormalizeMarkdownLinks = observeConfigValue(database, 'ExperimentalNormalizeMarkdownLinks');
    const siteURL = observeConfigValue(database, 'SiteURL');

    return {
        experimentalNormalizeMarkdownLinks,
        siteURL,
    };
});

export default withDatabase(enhance(MarkdownLink));

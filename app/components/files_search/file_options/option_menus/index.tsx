// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeCanDownloadFiles, observeEnableSecureFilePreview} from '@queries/servers/security';
import {observeConfigBooleanValue} from '@queries/servers/system';

import OptionMenus from './option_menus';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        canDownloadFiles: observeCanDownloadFiles(database),
        enablePublicLink: observeConfigBooleanValue(database, 'EnablePublicLink'),
        enableSecureFilePreview: observeEnableSecureFilePreview(database),
    };
});

export default withDatabase(enhance(OptionMenus));

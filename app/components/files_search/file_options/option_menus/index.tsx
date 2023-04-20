// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import compose from 'lodash/fp/compose';

import {observeConfigBooleanValue, observeCanDownloadFiles} from '@queries/servers/system';

import OptionMenus from './option_menus';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        canDownloadFiles: observeCanDownloadFiles(database),
        enablePublicLink: observeConfigBooleanValue(database, 'EnablePublicLink'),
    };
});

export default compose(
    withDatabase,
    enhance,
)(OptionMenus);

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeAllowedThemes} from '@queries/servers/system';
import {WithDatabaseArgs} from '@typings/database/database';

import DisplayTheme from './display_theme';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        allowedThemes: observeAllowedThemes(database),
    };
});

export default withDatabase(enhanced(DisplayTheme));

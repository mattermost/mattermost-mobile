// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {
    observeAllowedThemesKeys,
    observeCurrentTeamId,
    observeCurrentUserId,
} from '@queries/servers/system';
import {WithDatabaseArgs} from '@typings/database/database';

import DisplayTheme from './display_theme';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = observeCurrentTeamId(database);
    const currentUserId = observeCurrentUserId(database);

    return {
        allowedThemeKeys: observeAllowedThemesKeys(database),
        currentTeamId,
        currentUserId,
    };
});

export default withDatabase(enhanced(DisplayTheme));

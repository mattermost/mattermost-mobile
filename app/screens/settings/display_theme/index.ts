// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {
    observeAllowedThemesKeys,
    observeCurrentTeamId,
    observeCurrentUserId,
} from '@queries/servers/system';

import DisplayTheme from './display_theme';

import type {WithDatabaseArgs} from '@typings/database/database';

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

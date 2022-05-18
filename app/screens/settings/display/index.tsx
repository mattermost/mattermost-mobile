// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeConfigBooleanValue} from '@queries/servers/system';
import {WithDatabaseArgs} from '@typings/database/database';

import NotificationSettings from './display';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const isTimezoneEnabled = observeConfigBooleanValue(database, 'ExperimentalTimezone');
    const isThemeSwitchingEnabled = observeConfigBooleanValue(database, 'EnableThemeSelection');

    //     const enableTheme = isThemeSwitchingEnabled(state) && getAllowedThemes(state).length > 1;
    return {
        isTimezoneEnabled,
        isThemeSwitchingEnabled,
    };
});

export default withDatabase(enhanced(NotificationSettings));

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {map} from 'rxjs/operators';

import {getDisplayNamePreferenceAsBool} from '@helpers/api/preference';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {ScheduledPostCoreOptions} from '@screens/scheduled_post_options/core_options/core_options';

const enhance = withObservables([], ({database}) => {
    const preferences = queryDisplayNamePreferences(database).observeWithColumns(['value']);
    const isMilitaryTime = preferences.pipe(map((prefs) => getDisplayNamePreferenceAsBool(prefs, 'use_military_time')));

    return {
        isMilitaryTime,
    };
});

export default withDatabase(enhance(ScheduledPostCoreOptions));

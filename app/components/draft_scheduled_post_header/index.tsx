// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {map} from 'rxjs/operators';

import {getDisplayNamePreferenceAsBool} from '@helpers/api/preference';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {observeCurrentUser} from '@queries/servers/user';

import DraftAndScheduledPostHeader from './draft_scheduled_post_header';

const enhance = withObservables([], ({database}) => {
    const currentUser = observeCurrentUser(database);
    const preferences = queryDisplayNamePreferences(database).
        observeWithColumns(['value']);
    const isMilitaryTime = preferences.pipe(map((prefs) => getDisplayNamePreferenceAsBool(prefs, 'use_military_time')));

    return {
        currentUser,
        isMilitaryTime,
    };
});

export default withDatabase(enhance(DraftAndScheduledPostHeader));

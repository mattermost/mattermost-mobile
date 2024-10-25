// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {map} from 'rxjs/operators';

import {getDisplayNamePreferenceAsBool} from '@app/helpers/api/preference';
import {queryDisplayNamePreferences} from '@app/queries/servers/preference';
import {observeCurrentUser} from '@app/queries/servers/user';

import ChannelInfo from './channel_info';

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

export default withDatabase(enhance(ChannelInfo));

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import Preferences from '@app/constants/preferences';
import {PreferenceModel} from '@app/database/models/server';
import {queryPreferencesByCategoryAndName} from '@app/queries/servers/preference';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {observeCurrentChannelId, observeCurrentTeamId, observeOnlyUnreads} from '@queries/servers/system';
import {observeUnreadsAndMentionsInTeam} from '@queries/servers/thread';

import ThreadsButton from './threads_button';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = observeCurrentTeamId(database);

    return {
        currentChannelId: observeCurrentChannelId(database),
        groupUnreadsSeparately: queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS).
            observeWithColumns(['value']).
            pipe(
                switchMap((prefs: PreferenceModel[]) => of$(getPreferenceAsBool(prefs, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS, false))),
            ),
        onlyUnreads: observeOnlyUnreads(database),
        unreadsAndMentions: currentTeamId.pipe(
            switchMap(
                (teamId) => observeUnreadsAndMentionsInTeam(database, teamId),
            ),
        ),
    };
});

export default withDatabase(enhanced(ThreadsButton));

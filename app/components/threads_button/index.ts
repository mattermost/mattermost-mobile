// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import Preferences from '@constants/preferences';
import {getSidebarPreferenceAsBool} from '@helpers/api/preference';
import {querySidebarPreferences} from '@queries/servers/preference';
import {observeCurrentChannelId, observeCurrentTeamId, observeOnlyUnreads} from '@queries/servers/system';
import {observeUnreadsAndMentionsInTeam} from '@queries/servers/thread';

import ThreadsButton from './threads_button';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = observeCurrentTeamId(database);

    return {
        currentChannelId: observeCurrentChannelId(database),
        groupUnreadsSeparately: querySidebarPreferences(database, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS).
            observeWithColumns(['value']).
            pipe(
                switchMap((prefs: PreferenceModel[]) => of$(getSidebarPreferenceAsBool(prefs, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS))),
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

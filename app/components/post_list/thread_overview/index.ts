// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {observePost, queryPostReplies} from '@queries/servers/post';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';

import ThreadOverview from './thread_overview';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables(
    ['rootId'],
    ({database, rootId}: WithDatabaseArgs & {rootId: string}) => {
        return {
            rootPost: observePost(database, rootId),
            isSaved: queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_SAVED_POST, rootId).
                observeWithColumns(['value']).
                pipe(
                    switchMap((pref) => of$(Boolean(pref[0]?.value === 'true'))),
                ),
            repliesCount: queryPostReplies(database, rootId).observeCount(false),
        };
    });

export default withDatabase(enhanced(ThreadOverview));

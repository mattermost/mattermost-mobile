// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {MM_TABLES} from '@constants/database';

import ThreadOverview from './thread_overview';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';
import type PreferenceModel from '@typings/database/models/servers/preference';

const {SERVER: {POST, PREFERENCE}} = MM_TABLES;

const enhanced = withObservables(
    ['rootId'],
    ({database, rootId}: WithDatabaseArgs & {rootId: string}) => {
        return {
            rootPost: database.get<PostModel>(POST).query(
                Q.where('id', rootId),
            ).observe().pipe(

                // Root post might not have loaded while the thread screen is opening
                switchMap((posts) => posts[0]?.observe() || of$(undefined)),
            ),
            isSaved: database.
                get<PreferenceModel>(PREFERENCE).
                query(Q.where('category', Preferences.CATEGORY_SAVED_POST), Q.where('name', rootId)).
                observe().
                pipe(
                    switchMap((pref) => of$(Boolean(pref[0]?.value === 'true'))),
                ),
            repliesCount: database.get(POST).query(
                Q.where('root_id', rootId),
                Q.where('delete_at', Q.eq(0)),
            ).observeCount(),
        };
    });

export default withDatabase(enhanced(ThreadOverview));

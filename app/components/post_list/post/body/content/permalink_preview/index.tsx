// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {map, switchMap, distinctUntilChanged} from 'rxjs/operators';

import {getDisplayNamePreferenceAsBool} from '@helpers/api/preference';
import {observePost} from '@queries/servers/post';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {observeUser, observeTeammateNameDisplay, observeCurrentUser} from '@queries/servers/user';

import PermalinkPreview from './permalink_preview';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables(['embedData'], ({database, embedData}: WithDatabaseArgs & {embedData: PermalinkEmbedData}) => {
    const teammateNameDisplay = observeTeammateNameDisplay(database);
    const currentUser = observeCurrentUser(database);

    const preferences = queryDisplayNamePreferences(database).observeWithColumns(['value']);
    const isMilitaryTime = preferences.pipe(map((prefs) => getDisplayNamePreferenceAsBool(prefs, 'use_military_time')));

    const userId = embedData?.post?.user_id;
    const author = userId ? observeUser(database, userId) : of$(undefined);

    const post = embedData?.post_id ? observePost(database, embedData.post_id) : of$(undefined);
    const isOriginPostDeleted = post.pipe(
        switchMap((p) => {
            const initialDeleted = Boolean(embedData?.post?.delete_at > 0 || embedData?.post?.state === 'DELETED');
            return of$(p ? p.deleteAt > 0 : initialDeleted);
        }),
        distinctUntilChanged(),
    );

    return {
        teammateNameDisplay,
        currentUser,
        isMilitaryTime,
        author,
        post,
        isOriginPostDeleted,
    };
});

export default withDatabase(enhance(PermalinkPreview));
